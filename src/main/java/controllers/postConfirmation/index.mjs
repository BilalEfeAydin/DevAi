// Lambda: postConfirmation
// Trigger: Cognito Post Confirmation (runs after email verification)
// Env vars: TABLE_NAME = DevAi-Users
//
// Flow:
//   1. Extract user attributes from the Cognito event
//   2. Determine group from custom:role attribute (defaults to "student")
//   3. Add user to the appropriate Cognito group (instructor/student)
//   4. Create a record in the DevAi-Users DynamoDB table
//   5. Return the event to Cognito (required)

import {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const cognitoClient = new CognitoIdentityProviderClient({});
const ddbClient = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.TABLE_NAME || "DevAi-Users";

export const handler = async (event) => {
  console.log("PostConfirmation trigger fired:", JSON.stringify(event, null, 2));

  // Only run on actual sign-up confirmations, not other triggers
  if (event.triggerSource !== "PostConfirmation_ConfirmSignUp") {
    console.log("Skipping — trigger source is:", event.triggerSource);
    return event;
  }

  const userPoolId = event.userPoolId;
  const username = event.userName;
  const attributes = event.request.userAttributes || {};

  const email = attributes.email || "";
  const fullName = attributes.name || "";
  const familyName = attributes.family_name || "";
  const birthdate = attributes.birthdate || "";
  const gender = attributes.gender || "";
  const role = (attributes["custom:role"] || "student").toLowerCase();
  const userId = attributes.sub || username;

  // ── 1. Add user to the correct Cognito group ────────────────
  const groupName = role === "instructor" ? "instructor" : "student";

  try {
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: userPoolId,
      Username: username,
      GroupName: groupName,
    }));
    console.log(`Added user ${username} to group "${groupName}"`);
  } catch (err) {
    console.error(`Failed to add user to group "${groupName}":`, err);
    // Don't throw — we still want the confirmation to succeed
    // and we'll still try to create the DynamoDB record
  }

  // ── 2. Create record in DevAi-Users table ──────────────────
  const now = new Date().toISOString();

  try {
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        UserID: userId,
        Email: email,
        Role: groupName,
        FullName: fullName,
        FamilyName: familyName,
        Birthdate: birthdate,
        Gender: gender,
        CreatedAt: now,
        UpdatedAt: now,
      },
      ConditionExpression: "attribute_not_exists(UserID)",
    }));
    console.log(`Created DynamoDB record for user ${userId}`);
  } catch (err) {
    if (err.name === "ConditionalCheckFailedException") {
      console.log(`User ${userId} already exists in DynamoDB — skipping insert.`);
    } else {
      console.error("Failed to create DynamoDB record:", err);
      // Don't throw — confirmation should still succeed
    }
  }

  // ── 3. Return event to Cognito (required) ──────────────────
  return event;
};
