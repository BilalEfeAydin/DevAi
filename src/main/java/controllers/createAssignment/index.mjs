/**
 * Lambda: createAssignment
 * Trigger: API Gateway POST /assignments
 * Env var required: TABLE_NAME = DevAi-Assignments
 *
 * Description:
 * Allows an instructor to create a new assignment/exercise for a specific course.
 * Stores the assignment metadata and starter code in DynamoDB.
 */
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Assignments";

export const handler = async (event) => {
  try {
    // 1. Authorize user (Must be an instructor)
    const claims = event.requestContext.authorizer.jwt.claims;
    const callerGroups = claims["cognito:groups"] || [];
    const isInstructor = callerGroups.includes("Instructor");

    if (!isInstructor) {
      return respond(403, { message: "Only instructors can create assignments" });
    }

    // 2. Parse request body
    const body = JSON.parse(event.body);
    const { courseId, title, description, badge, maxAttempts, starterCode } = body;

    if (!courseId || !title) {
      return respond(400, { message: "courseId and title are required" });
    }

    // 3. Prepare assignment record
    const now = new Date().toISOString();
    const assignmentId = randomUUID();

    const item = {
      AssignmentID: assignmentId,
      CourseID: courseId,
      Title: title.trim(),
      Description: (description || "").trim(),
      Badge: (badge || "General").trim(),
      MaxAttempts: Number(maxAttempts) || 5,
      StarterCode: starterCode || "",
      InstructorID: claims.sub,
      CreatedAt: now,
      UpdatedAt: now,
    };

    // 4. Save to DynamoDB
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
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
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(bodyObj),
  };
}
