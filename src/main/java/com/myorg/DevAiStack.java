package com.myorg;

import software.constructs.Construct;
import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.Stack;
import software.amazon.awscdk.StackProps;

import com.myorg.constructs.ApiConstruct;
import com.myorg.constructs.AuthConstruct;
import com.myorg.constructs.DatabaseConstruct;
import com.myorg.constructs.HostingConstruct;
import com.myorg.constructs.StorageConstruct;

public class DevAiStack extends Stack {
    public DevAiStack(final Construct scope, final String id) {
        this(scope, id, null);
    }

    public DevAiStack(final Construct scope, final String id, final StackProps props) {
        super(scope, id, props);

        // =============================================
        // DATABASE (DynamoDB)
        // =============================================
        final DatabaseConstruct database = new DatabaseConstruct(this, "Database");

        // =============================================
        // STORAGE (S3)
        // =============================================
        final StorageConstruct storage = new StorageConstruct(this, "Storage");

        // =============================================
        // HOSTING (Amplify)
        // =============================================
        final HostingConstruct hosting = new HostingConstruct(this, "Hosting");

        // =============================================
        // API (Lambda + API Gateway)
        // =============================================
        final ApiConstruct api = new ApiConstruct(this, "Api", database.getSubmissionsTable());

        // =============================================
        // AUTH (Cognito Post-Confirmation trigger)
        // =============================================
        final AuthConstruct auth = new AuthConstruct(this, "Auth", database.getUsersTable());

        // =============================================
        // CLOUDFORMATION OUTPUTS
        // =============================================
        CfnOutput.Builder.create(this, "UsersTableName")
                .value(database.getUsersTable().getTableName())
                .description("DynamoDB Users table name")
                .build();

        CfnOutput.Builder.create(this, "UsersTableArn")
                .value(database.getUsersTable().getTableArn())
                .description("DynamoDB Users table ARN")
                .build();

        CfnOutput.Builder.create(this, "CoursesTableName")
                .value(database.getCoursesTable().getTableName())
                .description("DynamoDB Courses table name")
                .build();

        CfnOutput.Builder.create(this, "CoursesTableArn")
                .value(database.getCoursesTable().getTableArn())
                .description("DynamoDB Courses table ARN")
                .build();

        CfnOutput.Builder.create(this, "AssignmentsTableName")
                .value(database.getAssignmentsTable().getTableName())
                .description("DynamoDB Assignments table name")
                .build();

        CfnOutput.Builder.create(this, "AssignmentsTableArn")
                .value(database.getAssignmentsTable().getTableArn())
                .description("DynamoDB Assignments table ARN")
                .build();

        CfnOutput.Builder.create(this, "SubmissionsTableName")
                .value(database.getSubmissionsTable().getTableName())
                .description("DynamoDB Submissions table name")
                .build();

        CfnOutput.Builder.create(this, "SubmissionsTableArn")
                .value(database.getSubmissionsTable().getTableArn())
                .description("DynamoDB Submissions table ARN")
                .build();

        // S3 Outputs
        CfnOutput.Builder.create(this, "HonorCodeBucketName")
                .value(storage.getHonorCodeBucket().getBucketName())
                .description("S3 Honor Code documents bucket name")
                .build();

        CfnOutput.Builder.create(this, "HonorCodeBucketArn")
                .value(storage.getHonorCodeBucket().getBucketArn())
                .description("S3 Honor Code documents bucket ARN")
                .build();

        CfnOutput.Builder.create(this, "SubmissionsBucketName")
                .value(storage.getSubmissionsBucket().getBucketName())
                .description("S3 Submissions bucket name")
                .build();

        CfnOutput.Builder.create(this, "SubmissionsBucketArn")
                .value(storage.getSubmissionsBucket().getBucketArn())
                .description("S3 Submissions bucket ARN")
                .build();

        // Amplify Outputs
        CfnOutput.Builder.create(this, "AmplifyAppId")
                .value(hosting.getAppId())
                .description("Amplify App ID")
                .build();

        CfnOutput.Builder.create(this, "AmplifyAppUrl")
                .value("https://main." + hosting.getDefaultDomain())
                .description("Amplify production URL")
                .build();

        // API Outputs
        CfnOutput.Builder.create(this, "ApiUrl")
                .value(api.getApiUrl())
                .description("HTTP API Gateway URL")
                .build();
    }
}

