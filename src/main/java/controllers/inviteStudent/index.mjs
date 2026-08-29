import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);
const ENROLLMENTS_TABLE = process.env.TABLE_NAME || "DevAi-Enrollments";
const USERS_TABLE = process.env.USERS_TABLE || "DevAi-Users";
const COURSES_TABLE = process.env.COURSES_TABLE || "DevAi-Courses";

export const handler = async (event) => {
  try {
    const claims = event.requestContext.authorizer.jwt.claims;
    const callerGroups = claims["cognito:groups"] || [];
    const isInstructor = callerGroups.includes("Instructor");

    if (!isInstructor) {
      return respond(403, { message: "Only instructors can invite students" });
    }

    const body = JSON.parse(event.body);
    const { courseId, email } = body;

    if (!courseId || !email) {
      return respond(400, { message: "courseId and email are required" });
    }

    // 1. Look up studentId from email via Users table EmailIndex
    const userResult = await ddb.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "Email = :email",
      ExpressionAttributeValues: { ":email": email.trim().toLowerCase() },
    }));

    // Also try with original case if no result
    let user = userResult.Items?.[0];
    if (!user) {
      const userResult2 = await ddb.send(new QueryCommand({
        TableName: USERS_TABLE,
        IndexName: "EmailIndex",
        KeyConditionExpression: "Email = :email",
        ExpressionAttributeValues: { ":email": email.trim() },
      }));
      user = userResult2.Items?.[0];
    }

    if (!user) {
      return respond(404, { message: "No student found with this email" });
    }

    const studentId = user.UserID;
    const studentName = [user.FullName, user.FamilyName].filter(Boolean).join(" ") || email;

    // 2. Check if already invited or enrolled
    const existingResult = await ddb.send(new GetCommand({
      TableName: ENROLLMENTS_TABLE,
      Key: { CourseID: courseId, StudentID: studentId },
    }));

    if (existingResult.Item) {
      const status = existingResult.Item.Status;
      if (status === "accepted") {
        return respond(409, { message: "Student is already enrolled in this course" });
      }
      if (status === "invited") {
        return respond(409, { message: "An invitation is already pending for this student" });
      }
    }

    // 3. Get course title for the notification display
    let courseTitle = "Course";
    let instructorName = "Instructor";
    try {
      const courseResult = await ddb.send(new GetCommand({
        TableName: COURSES_TABLE,
        Key: { CourseID: courseId },
      }));
      if (courseResult.Item) {
        courseTitle = courseResult.Item.Title || "Course";
        instructorName = courseResult.Item.InstructorName || "Instructor";
      }
    } catch (e) {
      console.warn("Could not fetch course details:", e);
    }

    // 4. Create the enrollment record
    const now = new Date().toISOString();

    await ddb.send(new PutCommand({
      TableName: ENROLLMENTS_TABLE,
      Item: {
        CourseID: courseId,
        StudentID: studentId,
        StudentEmail: email.trim(),
        StudentName: studentName,
        CourseTitle: courseTitle,
        InstructorName: instructorName,
        Status: "invited",
        InvitedBy: claims.sub,
        CreatedAt: now,
        UpdatedAt: now,
      },
    }));

    return respond(201, {
      message: "Invitation sent",
      courseId,
      studentId,
      studentEmail: email.trim(),
      studentName,
      status: "invited",
    });

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
