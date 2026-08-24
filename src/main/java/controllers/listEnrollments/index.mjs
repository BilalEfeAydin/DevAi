import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Enrollments";

export const handler = async (event) => {
  try {
    const claims = event.requestContext.authorizer.jwt.claims;
    const callerGroups = claims["cognito:groups"] || [];
    const isInstructor = callerGroups.includes("Instructor");
    const callerSub = claims.sub;

    const courseId = event.queryStringParameters?.courseId;
    const studentId = event.queryStringParameters?.studentId;

    // Mode 1: Instructor queries all enrollments for a course
    if (isInstructor && courseId) {
      const result = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "CourseID = :cid",
        ExpressionAttributeValues: { ":cid": courseId },
      }));

      return respond(200, { courseId, enrollments: result.Items || [] });
    }

    // Mode 2: Student queries their own pending invitations
    if (!isInstructor) {
      // Students can only query their own enrollments
      const targetStudentId = studentId || callerSub;

      if (targetStudentId !== callerSub) {
        return respond(403, { message: "You can only view your own enrollments" });
      }

      const result = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "StudentIndex",
        KeyConditionExpression: "StudentID = :sid",
        ExpressionAttributeValues: { ":sid": targetStudentId },
      }));

      return respond(200, {
        studentId: targetStudentId,
        enrollments: result.Items || [],
      });
    }

    // Instructor without courseId
    return respond(400, { message: "courseId query parameter is required for instructors" });

  } catch (err) {
    console.error(err);
    return respond(500, { message: "Internal server error", error: err.message });
  }
};

function respond(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(bodyObj),
  };
}
