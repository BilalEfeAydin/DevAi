// Lambda: postSubmission
// Trigger: API Gateway POST /submissions
// Env var required: TABLE_NAME = DevAi-Submissions

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

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

    const now = new Date().toISOString();
    const item = {
      SubmissionID: randomUUID(),
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
      // Safety: never overwrite an existing SubmissionID (won't happen with UUID, but cheap to keep)
      ConditionExpression: "attribute_not_exists(SubmissionID)",
    }));

    return respond(201, item);
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