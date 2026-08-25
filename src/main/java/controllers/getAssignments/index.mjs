/**
 * Lambda: getAssignments
 * Trigger: API Gateway GET /assignments
 * Env var required: TABLE_NAME = DevAi-Assignments
 *
 * Description:
 * Fetches all assignments (exercises) for a given courseId.
 * Used by both instructors (in the course overview) and students (in the course details).
 * Uses the CourseIndex GSI to efficiently query assignments for a course.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Assignments";

export const handler = async (event) => {
  try {
    // 1. Extract courseId from query parameters
    const courseId = event.queryStringParameters?.courseId;

    if (!courseId) {
      return respond(400, { message: "courseId query parameter is required" });
    }

    // 2. Query DynamoDB using the CourseIndex GSI
    const result = await ddb.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: "CourseIndex",
      KeyConditionExpression: "CourseID = :cid",
      ExpressionAttributeValues: { ":cid": courseId },
      ScanIndexForward: true, // oldest first
    }));

    // 3. Return the array of assignment items
    return respond(200, result.Items || []);

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
