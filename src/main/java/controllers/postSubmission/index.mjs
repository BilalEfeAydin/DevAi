// Lambda: postSubmission
// Trigger: API Gateway POST /submissions
// Env vars: TABLE_NAME = DevAi-Submissions
//           E2B_API_KEY = (from Secrets Manager)
//           BEDROCK_MODEL_ID = us.anthropic.claude-haiku-4-5-20251001-v1:0
//
// Flow:
//   1. Parse request body (courseId, studentId, content)
//   2. Save submission to DynamoDB with status "submitted"
//   3. Spin up E2B sandbox and execute the student's code
//   4. Count previous attempts for this student+course → determine hint level
//   5. Call Bedrock AI for Socratic code review (progressive hints)
//   6. Update the DynamoDB record with execution + AI review results
//   7. Return everything to the frontend

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { randomUUID } from "crypto";
import { Sandbox } from "@e2b/code-interpreter";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Submissions";
const BEDROCK_MODEL_ID = process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-haiku-4-5-20251001-v1:0";

// ── Hardcoded honor code (will be replaced with S3 fetch once Teacher API is built) ──
const HONOR_CODE = `
University Honor Code — CS Department:
1. Students must write their own code. Copy-pasting from external sources is prohibited.
2. Students may discuss high-level ideas with peers, but must not share or copy code.
3. Use of AI code-generation tools (e.g., Copilot) is allowed ONLY for understanding concepts,
   not for generating submission code.
4. All submitted code must include comments explaining the student's reasoning.
`;

// ── Build graduated system prompt based on attempt number ──────────
function buildSystemPrompt(attemptNumber, hasPreviousReview) {
  let hintLevel, hintInstructions;

  if (attemptNumber <= 2) {
    hintLevel = "LEVEL 1 — HIGHLY ABSTRACT";
    hintInstructions = `
HINT LEVEL: HIGHLY ABSTRACT (Attempt 1-2)
- Ask the MOST abstract Socratic questions possible.
- NEVER reference specific line numbers in your questions (you should still include them in the JSON "line" field).
- NEVER mention the type of error (syntax, logic, bounds, etc.).
- Focus on broad questions like "What assumptions does your program make about its inputs?"
- The student should have to think hard to even figure out WHERE the issue is.`;
  } else if (attemptNumber <= 4) {
    hintLevel = "LEVEL 2 — MODERATELY SPECIFIC";
    hintInstructions = `
HINT LEVEL: MODERATELY SPECIFIC (Attempt 3-4)
- You may now reference the GENERAL AREA of the issue (e.g., "around your loop logic" or "in your method signature").
- You may mention the TYPE of error (e.g., "there may be a syntax issue").
- Still do NOT quote the student's code or suggest the fix.
- Guide them closer: "What happens at the boundary of your iteration?"`;
  } else {
    hintLevel = "LEVEL 3 — DIRECT HINTS";
    hintInstructions = `
HINT LEVEL: DIRECT HINTS (Attempt 5+)
- You may now reference SPECIFIC LINE NUMBERS in your question text.
- You may describe the exact nature of the problem (e.g., "the array is one element too small").
- Still do NOT write the corrected code for them.
- Be as helpful as possible: "On line X, you create an array of size N, but then try to access index N. What happens?"`;
  }

  const versionComparisonSchema = hasPreviousReview ? `
  "resolvedIssues": [
    { "line": <line_number>, "originalMessage": "The original Socratic question", "resolution": "Brief explanation of how the student fixed it" }
  ],
  "persistingIssues": [
    { "line": <line_number>, "originalMessage": "The original Socratic question", "message": "Your updated Socratic question focusing on why the issue still persists" }
  ],` : "";

  return `You are an expert, minimalist Computer Science Professor acting as a Socratic tutor.
Evaluate the provided student code against the Honor Code and for any logic or syntax errors.

This is the student's ATTEMPT #${attemptNumber} for this assignment.
Current hint level: ${hintLevel}

${hintInstructions}

STATUS DEFINITIONS:
- PASS: Code compiles, logic is correct, and the honor code is fully respected. No issues found.
- NEEDS_REVIEW: Code has syntax or logic errors, but there are no honor code violations.
- VIOLATION: Suspected honor code breach (e.g., no comments explaining reasoning, suspiciously perfect or copy-pasted patterns).

CRITICAL CONSTRAINTS FOR YOUR QUESTIONS:
1. Check if the code appears to violate any rules in the provided <honor_code>.
2. Avoid directly quoting the student's code. You may reference general concepts but never copy-paste their exact code.
3. NEVER suggest the correct syntax or alternative logic.
4. NEVER NAME the specific operator, keyword, or syntax the student used incorrectly. Do NOT contrast what they wrote with what they should have written (e.g., NEVER say "you used X instead of Y").
5. Your questions should make the student THINK about the problem, not reveal it. A good question forces them to re-read their code and discover the issue themselves.
6. The "summary" field MUST ALSO obey these rules. The summary must be a generic, high-level assessment (e.g., "The code has a syntax error") and MUST NOT give away the specific error or solution.
7. The student code has explicit line numbers prepended. You MUST use these line numbers in your JSON response.
8. Order feedback items by severity: VIOLATION issues first, then concerns, then suggestions.
9. If the code is correct and follows the honor code, return status PASS with an empty feedback array.
10. EVERY Socratic question/message in your feedback array MUST be extremely concise (AT MOST 1 SENTENCES MAXIMUM). Do not ramble.
11. MUTUAL EXCLUSIVITY: An issue is EITHER a persisting issue OR a new issue. NEVER put the same issue in both the "persistingIssues" and "feedback" arrays.

Respond with a JSON object in this format:
{
  "status": "PASS" | "NEEDS_REVIEW" | "VIOLATION",
  "summary": "Brief overall assessment",
  "generalSuggestion": "Brief suggestion about the whole code if there is",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "attemptNumber": ${attemptNumber},
  "hintLevel": "${hintLevel}",${versionComparisonSchema}
  "feedback": [
    {
      "line": <line_number>,
      "type": "suggestion" | "concern" | "violation",
      "message": "Your Socratic question here (adjusted to the current hint level)"
    }
  ]
}

CRITICAL: Do NOT wrap the response in \`\`\`json or \`\`\` code blocks.
Do NOT include any markdown syntax.
The very first character of your response MUST be '{' and the very last character MUST be '}'.`;
}

// ── Fetch previous submission for this student + course ─────────────
async function fetchPreviousSubmission(studentId, courseId) {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "StudentIndex",
      KeyConditionExpression: "StudentID = :sid",
      FilterExpression: "CourseID = :cid",
      ExpressionAttributeValues: {
        ":sid": studentId,
        ":cid": courseId,
      },
      ScanIndexForward: false, // Newest first
    }));
    
    const items = result.Items || [];
    const count = items.length;
    // Find the most recent submission that has a VALID aiReview (not a fallback)
    const latestWithReview = items.find(
      item => item.aiReview && item.aiReview.confidence !== "LOW"
    ) || null;

    return {
      count,
      previousReview: latestWithReview ? latestWithReview.aiReview : null,
    };
  } catch (err) {
    console.warn("Could not fetch previous submissions (index may not exist yet):", err.message);
    return { count: 0, previousReview: null };
  }
}

// ── Call Bedrock AI for code review ───────────────────────────────
async function reviewWithBedrock(code, attemptNumber, previousReview) {
  // Add line numbers to the code
  const numberedCode = code
    .split("\n")
    .map((line, i) => `${i + 1}: ${line}`)
    .join("\n");

  const hasPreviousReview = previousReview != null;
  let systemPrompt = buildSystemPrompt(attemptNumber, hasPreviousReview);

  if (hasPreviousReview) {
    systemPrompt += `\n\nCOMPARISON INSTRUCTIONS:
- You have been provided with the student's PREVIOUS AI review in the user message.
- Compare their current code against the issues flagged in that previous review.
- For each previous issue, determine if the student RESOLVED it or if it PERSISTS.
- Populate the "resolvedIssues" array with items they successfully fixed. Start your summary by praising them for fixing these.
- Populate the "persistingIssues" array with items that STILL exist. Guide them further on these issues based on the current hint level.
- Any completely NEW issues found in the current code should go into the standard "feedback" array.`;
  }

  let userMessage = `Please review the following student code submission against the honor code.

<honor_code>
${HONOR_CODE}
</honor_code>

<student_code>
${numberedCode}
</student_code>`;

  if (previousReview) {
    userMessage += `\n\n<previous_review attempt="${previousReview.attemptNumber || attemptNumber - 1}">
${JSON.stringify(previousReview, null, 2)}
</previous_review>`;
  }

  // Retry up to 2 times for JSON parsing failures
  for (let retry = 0; retry < 2; retry++) {
    try {
      const response = await bedrockClient.send(new ConverseCommand({
        modelId: BEDROCK_MODEL_ID,
        system: [{ text: systemPrompt }],
        messages: [
          {
            role: "user",
            content: [{ text: userMessage }],
          },
        ],
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.1,
        },
      }));

      const outputText = response.output.message.content[0].text;

      // Robust JSON extraction: find the first '{' and last '}'
      let jsonStr = outputText;
      const firstBrace = jsonStr.indexOf("{");
      const lastBrace = jsonStr.lastIndexOf("}");

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(jsonStr);
      return parsed;
    } catch (parseErr) {
      console.warn(`Bedrock response parse attempt ${retry + 1} failed:`, parseErr.message);
      if (retry === 1) {
        // Return a safe fallback after all retries exhausted
        return {
          status: "NEEDS_REVIEW",
          summary: "AI review could not be completed at this time.",
          generalSuggestion: "Please try submitting again.",
          confidence: "LOW",
          attemptNumber,
          hintLevel: "UNKNOWN",
          feedback: [],
        };
      }
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────
export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
    const { courseId, studentId, content, submitForReview } = body;

    if (!courseId || !studentId || !content) {
      return respond(400, { message: "courseId, studentId and content are required" });
    }

    // ── 1. Save submission to DynamoDB (only on formal submit) ──
    const now = new Date().toISOString();
    const submissionId = randomUUID();

    if (submitForReview) {
      const item = {
        SubmissionID: submissionId,
        CourseID: courseId,
        StudentID: studentId,
        content,
        status: "submitted",
        CreatedAt: now,
        UpdatedAt: now,
      };

      await ddb.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
        ConditionExpression: "attribute_not_exists(SubmissionID)",
      }));
    }

    // ── 2. Execute code in E2B sandbox ─────────────────────────
    let executionResult = {
      executionStatus: "pending",
      stdout: [],
      stderr: [],
      error: null,
    };

    let sandbox;
    try {
      sandbox = await Sandbox.create();
      const execution = await sandbox.runCode(content);

      // Capture stdout
      executionResult.stdout = execution.logs.stdout || [];

      // Capture stderr
      executionResult.stderr = execution.logs.stderr || [];

      // Check for execution errors
      if (execution.error) {
        executionResult.executionStatus = "failed";
        executionResult.error = {
          name: execution.error.name,
          value: execution.error.value,
          traceback: execution.error.traceback,
        };
      } else {
        executionResult.executionStatus = "passed";
      }
    } catch (e2bErr) {
      console.error("E2B sandbox error:", e2bErr);
      executionResult.executionStatus = "error";
      executionResult.error = {
        name: "SandboxError",
        value: e2bErr.message || "Failed to create or run E2B sandbox",
        traceback: "",
      };
    } finally {
      if (sandbox) {
        try { await sandbox.kill(); } catch (_) { /* ignore cleanup errors */ }
      }
    }

    // ── 3. AI Review via Bedrock (only on formal submit) ───────
    let aiReview = null;
    let attemptNumber = null;

    if (submitForReview) {
      const { count, previousReview } = await fetchPreviousSubmission(studentId, courseId);
      attemptNumber = count + 1;

      try {
        aiReview = await reviewWithBedrock(content, attemptNumber, previousReview);
      } catch (bedrockErr) {
        console.error("Bedrock AI review error:", bedrockErr);
        aiReview = {
          status: "NEEDS_REVIEW",
          summary: "AI review encountered an error.",
          generalSuggestion: "The code was executed successfully. AI feedback will be available on retry.",
          confidence: "LOW",
          attemptNumber,
          hintLevel: "UNKNOWN",
          feedback: [],
        };
      }

      // ── 4. Update DynamoDB with execution + AI review results ──
      const updatedAt = new Date().toISOString();
      await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { SubmissionID: submissionId },
        UpdateExpression:
          "SET #status = :status, executionStatus = :execStatus, stdout = :stdout, stderr = :stderr, executionError = :error, aiReview = :aiReview, attemptNumber = :attemptNum, UpdatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":status": "reviewed",
          ":execStatus": executionResult.executionStatus,
          ":stdout": executionResult.stdout,
          ":stderr": executionResult.stderr,
          ":error": executionResult.error,
          ":aiReview": aiReview,
          ":attemptNum": attemptNumber,
          ":updatedAt": updatedAt,
        },
      }));
    }

    // ── 5. Return full result to frontend ──────────────────────
    return respond(submitForReview ? 201 : 200, {
      ...(submitForReview ? {
        submission: {
          SubmissionID: submissionId,
          CourseID: courseId,
          StudentID: studentId,
          content,
          status: "reviewed",
          attemptNumber,
        },
      } : {}),
      execution: executionResult,
      ...(aiReview ? { aiReview } : {}),
    });

  } catch (err) {
    console.error(err);
    return respond(500, { message: "Internal server error", error: err.message });
  }
};

function respond(statusCode, bodyObj) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(bodyObj),
  };
}