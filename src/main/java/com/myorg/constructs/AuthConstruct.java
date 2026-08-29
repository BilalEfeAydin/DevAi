package com.myorg.constructs;

import java.util.List;
import java.util.Map;

import software.constructs.Construct;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.services.lambda.Function;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.dynamodb.Table;

import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Effect;

/**
 * CDK Construct that provisions the Cognito Post-Confirmation Lambda trigger.
 *
 * This Lambda runs after a user verifies their email and:
 * 1. Adds the user to the correct Cognito group (instructor/student)
 * 2. Creates a record in the DevAi-Users DynamoDB table
 *
 * NOTE: Because the Cognito User Pool was created outside this CDK project,
 * the trigger must be attached manually via the AWS Console:
 *   Cognito → User Pool → User pool properties → Lambda triggers → Post confirmation
 */
public class AuthConstruct extends Construct {

    private final Function postConfirmationFn;

    public AuthConstruct(final Construct scope, final String id, final Table usersTable) {
        super(scope, id);

        // =============================================
        // 1. POST-CONFIRMATION LAMBDA
        // =============================================
        this.postConfirmationFn = Function.Builder.create(this, "PostConfirmationFn")
                .functionName("DevAi-PostConfirmation")
                .runtime(Runtime.NODEJS_24_X)
                .handler("index.handler")
                .code(Code.fromAsset("src/main/java/controllers/postConfirmation"))
                .timeout(Duration.seconds(10))
                .environment(Map.of("TABLE_NAME", usersTable.getTableName()))
                .build();

        // =============================================
        // 2. IAM PERMISSIONS
        // =============================================

        // Grant write access to the Users table
        usersTable.grantWriteData(this.postConfirmationFn);

        // Grant permission to add users to Cognito groups
        // Scoped to the specific User Pool used by DevAi
        this.postConfirmationFn.addToRolePolicy(PolicyStatement.Builder.create()
                .effect(Effect.ALLOW)
                .actions(List.of("cognito-idp:AdminAddUserToGroup"))
                .resources(List.of("arn:aws:cognito-idp:us-east-1:*:userpool/us-east-1_miUx3W5Cq"))
                .build());
    }

    // =============================================
    // PUBLIC ACCESSORS
    // =============================================

    public Function getPostConfirmationFn() {
        return this.postConfirmationFn;
    }
}
