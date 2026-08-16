// Lambda: getCourses
// Trigger: API Gateway GET /courses
// Env var required: TABLE_NAME = DevAi-Courses
//
// Supports two query patterns via query string params:
//   ?studentId=xxx    -> courses where the student is enrolled (Scan with filter)
//   ?instructorId=xxx -> courses owned by the instructor (Query on InstructorIndex)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Courses";

export const handler = async (event) => {
  try {
    // Extract caller identity from JWT
    const claims = event.requestContext?.authorizer?.jwt?.claims || {};
    const callerSub = claims.sub;
    const callerGroups = claims["cognito:groups"] || "";

    const params = event.queryStringParameters || {};
    const { studentId, instructorId } = params;

    if (studentId) {
      // Security: students can only query their own enrollments
      if (callerSub && studentId !== callerSub) {
        return respond(403, { message: "You can only view your own courses." });
      }

      // Scan for courses where EnrolledStudents contains this student
      const result = await ddb.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "contains(EnrolledStudents, :sid)",
        ExpressionAttributeValues: { ":sid": studentId },
      }));

      return respond(200, result.Items || []);
    }

    if (instructorId) {
      // Security: instructors can only query their own courses
      if (callerSub && instructorId !== callerSub) {
        return respond(403, { message: "You can only view your own courses." });
      }

      const result = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "InstructorIndex",
        KeyConditionExpression: "InstructorID = :iid",
        ExpressionAttributeValues: { ":iid": instructorId },
      }));

      return respond(200, result.Items || []);
    }

    return respond(400, { message: "Provide one of: studentId, instructorId" });
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
