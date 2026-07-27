// Lambda: getSubmission
// Trigger: API Gateway GET /submissions
// Env var required: TABLE_NAME = DevAi-Submissions

// Supports three query patterns via query string params:
//   ?submissionId=xxx   -> single submission (GetItem)
//   ?studentId=xxx      -> all submissions for a student (Query on StudentIndex)
//   ?courseId=xxx       -> all submissions for a course, e.g. teacher view (Query on CourseIndex)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Submissions";

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const { submissionId, studentId, courseId } = params;

    if (submissionId) {
      const result = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { SubmissionID: submissionId },
      }));
      if (!result.Item) return respond(404, { message: "Submission not found" });
      return respond(200, result.Item);
    }

    if (studentId) {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "StudentIndex",
        KeyConditionExpression: "StudentID = :sid",
        ExpressionAttributeValues: { ":sid": studentId },
      }));
      return respond(200, result.Items);
    }

    if (courseId) {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "CourseIndex",
        KeyConditionExpression: "CourseID = :cid",
        ExpressionAttributeValues: { ":cid": courseId },
      }));
      return respond(200, result.Items);
    }

    return respond(400, { message: "Provide one of: submissionId, studentId, courseId" });
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