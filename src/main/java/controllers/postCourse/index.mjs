// Lambda: postCourse
// Trigger: API Gateway POST /courses
// Env vars:
//   COURSES_TABLE_NAME = DevAi-Courses
//   HONOR_CODE_BUCKET  = devai-honor-code-docs
//
// Flow:
//   1. Extract instructor identity from JWT claims
//   2. Validate request body (title required)
//   3. Upload rules.json to S3
//   4. Optionally upload honor-code.txt to S3 (only if provided)
//   5. Write course record to DynamoDB
//   6. Return the new course

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const s3Client = new S3Client({});

const COURSES_TABLE = process.env.COURSES_TABLE_NAME || "DevAi-Courses";
const HONOR_CODE_BUCKET = process.env.HONOR_CODE_BUCKET || "devai-honor-code-docs";

export const handler = async (event) => {
  try {
    // ── 0. Extract caller identity from JWT ──────────────────
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const callerSub = claims.sub;
    const callerGroups = claims["cognito:groups"] || [];

    // Only instructors can create courses
    const isInstructor = Array.isArray(callerGroups) 
      ? callerGroups.some(g => g.toLowerCase() === "instructor")
      : typeof callerGroups === "string" && callerGroups.toLowerCase().includes("instructor");

    if (!isInstructor) {
      return respond(403, { message: "Only instructors can create courses." });
    }

    const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
    const { title, description, rules, honorCodeText, instructorName } = body;

    if (!title || !title.trim()) {
      return respond(400, { message: "Course title is required." });
    }

    const courseId = `course-${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    // ── 1. Upload rules.json to S3 ──────────────────────────
    let rulesURI = null;
    if (rules && Object.keys(rules).length > 0) {
      const rulesKey = `${courseId}/rules.json`;
      await s3Client.send(new PutObjectCommand({
        Bucket: HONOR_CODE_BUCKET,
        Key: rulesKey,
        Body: JSON.stringify(rules, null, 2),
        ContentType: "application/json",
      }));
      rulesURI = `s3://${HONOR_CODE_BUCKET}/${rulesKey}`;
    }

    // ── 2. Upload honor-code.txt to S3 (optional) ───────────
    let honorCodeURI = null;
    if (honorCodeText && honorCodeText.trim()) {
      const honorKey = `${courseId}/honor-code.txt`;
      await s3Client.send(new PutObjectCommand({
        Bucket: HONOR_CODE_BUCKET,
        Key: honorKey,
        Body: honorCodeText,
        ContentType: "text/plain",
      }));
      honorCodeURI = `s3://${HONOR_CODE_BUCKET}/${honorKey}`;
    }

    // ── 3. Write course record to DynamoDB ───────────────────
    const courseItem = {
      CourseID: courseId,
      InstructorID: callerSub,
      Title: title.trim(),
      Description: description || "",
      InstructorName: instructorName || "Instructor",
      EnrolledStudents: [],
      CreatedAt: now,
      UpdatedAt: now,
    };

    // Only include URIs if the files were actually uploaded
    if (rulesURI) courseItem.RulesURI = rulesURI;
    if (honorCodeURI) courseItem.HonorCodeDocURI = honorCodeURI;

    await ddb.send(new PutCommand({
      TableName: COURSES_TABLE,
      Item: courseItem,
    }));

    return respond(201, {
      message: "Course created successfully.",
      course: courseItem,
    });
  } catch (err) {
    console.error("postCourse error:", err);
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
