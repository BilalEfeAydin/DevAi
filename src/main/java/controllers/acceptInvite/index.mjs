import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Enrollments";
const COURSES_TABLE = process.env.COURSES_TABLE || "DevAi-Courses";

export const handler = async (event) => {
  try {
    const claims = event.requestContext.authorizer.jwt.claims;
    const studentId = claims.sub; // student can only accept their own invite

    const body = JSON.parse(event.body);
    const { courseId } = body;

    if (!courseId) {
      return respond(400, { message: "courseId is required" });
    }

    // Check the invite actually exists first
    const existing = await ddb.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { CourseID: courseId, StudentID: studentId },
    }));

    if (!existing.Item) {
      return respond(404, { message: "No invitation found for this course" });
    }

    if (existing.Item.Status === "accepted") {
      return respond(200, { message: "Already accepted", courseId, studentId });
    }

    const now = new Date().toISOString();

    // 1. Update enrollment status to "accepted"
    await ddb.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { CourseID: courseId, StudentID: studentId },
      UpdateExpression: "SET #status = :status, UpdatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "Status" },
      ExpressionAttributeValues: {
        ":status": "accepted",
        ":updatedAt": now,
      },
    }));

    // 2. Add student to the course's EnrolledStudents list in DevAi-Courses
    //    This is what getCourses Lambda checks when filtering courses for a student.
    await ddb.send(new UpdateCommand({
      TableName: COURSES_TABLE,
      Key: { CourseID: courseId },
      UpdateExpression: "SET EnrolledStudents = list_append(if_not_exists(EnrolledStudents, :empty), :sid)",
      ExpressionAttributeValues: {
        ":sid": [studentId],
        ":empty": [],
      },
    }));

    return respond(200, { message: "Invitation accepted", courseId, studentId, status: "accepted" });

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
