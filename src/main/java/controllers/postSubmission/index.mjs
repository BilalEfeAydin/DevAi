// Lambda: postSubmission
// Trigger: API Gateway POST /submissions
// Env vars: TABLE_NAME = DevAi-Submissions, E2B_API_KEY = (from Secrets Manager)
//
// Flow:
//   1. Parse request body (courseId, studentId, content)
//   2. Save submission to DynamoDB with status "submitted"
//   3. Spin up E2B sandbox and execute the student's code
//   4. Capture stdout, stderr, and errors
//   5. Update the DynamoDB record with execution results
//   6. Return everything to the frontend

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { Sandbox } from "@e2b/code-interpreter";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Submissions";

export const handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
    const { courseId, studentId, content } = body;

    if (!courseId || !studentId || !content) {
      return respond(400, { message: "courseId, studentId and content are required" });
    }

    // ── 1. Save submission to DynamoDB ──────────────────────────
    const now = new Date().toISOString();
    const submissionId = randomUUID();
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

    // ── 3. Update DynamoDB with execution results ──────────────
    const updatedAt = new Date().toISOString();
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { SubmissionID: submissionId },
      UpdateExpression:
        "SET #status = :status, executionStatus = :execStatus, stdout = :stdout, stderr = :stderr, executionError = :error, UpdatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "executed",
        ":execStatus": executionResult.executionStatus,
        ":stdout": executionResult.stdout,
        ":stderr": executionResult.stderr,
        ":error": executionResult.error,
        ":updatedAt": updatedAt,
      },
    }));

    // ── 4. Return full result to frontend ──────────────────────
    return respond(201, {
      submission: {
        ...item,
        status: "executed",
        UpdatedAt: updatedAt,
      },
      execution: executionResult,
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