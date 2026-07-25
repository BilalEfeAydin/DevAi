const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Submissions";

exports.handler = async (event) => {
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : (event.body || {});
    const { courseId, studentId, content } = body;

    if (!courseId || !studentId || !content) {
      return respond(400, { message: "courseId, studentId and content are required" });
    }

    const now = new Date().toISOString();
    const item = {
      submissionId: randomUUID(),
      courseId,
      studentId,
      content,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
      // Safety: never overwrite an existing submissionId (won't happen with UUID, but cheap to keep)
      ConditionExpression: "attribute_not_exists(submissionId)",
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