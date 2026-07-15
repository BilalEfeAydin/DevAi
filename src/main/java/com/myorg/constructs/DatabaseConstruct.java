package com.myorg.constructs;

import software.constructs.Construct;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.services.dynamodb.Attribute;
import software.amazon.awscdk.services.dynamodb.AttributeType;
import software.amazon.awscdk.services.dynamodb.BillingMode;
import software.amazon.awscdk.services.dynamodb.GlobalSecondaryIndexProps;
import software.amazon.awscdk.services.dynamodb.ProjectionType;
import software.amazon.awscdk.services.dynamodb.Table;

/**
 * CDK Construct that provisions the DynamoDB tables for DevAi:
 * - Users (GSI: EmailIndex)
 * - Courses (GSI: InstructorIndex)
 * - Submissions (GSIs: CourseIndex, StudentIndex — both with CreatedAt sort key)
 *
 * All tables use PAY_PER_REQUEST billing and DESTROY removal policy (dev).
 * Timestamps (CreatedAt, UpdatedAt) use ISO 8601 strings at the application layer.
 */
public class DatabaseConstruct extends Construct {

    private final Table usersTable;
    private final Table coursesTable;
    private final Table submissionsTable;

    public DatabaseConstruct(final Construct scope, final String id) {
        super(scope, id);

        // =============================================
        // 1. USERS TABLE
        // =============================================
        // PK: UserID (String)
        // Attributes: Email, Role, CreatedAt, UpdatedAt
        // GSI: EmailIndex (PK: Email)
        this.usersTable = Table.Builder.create(this, "UsersTable")
                .tableName("DevAi-Users")
                .partitionKey(Attribute.builder()
                        .name("UserID")
                        .type(AttributeType.STRING)
                        .build())
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        this.usersTable.addGlobalSecondaryIndex(GlobalSecondaryIndexProps.builder()
                .indexName("EmailIndex")
                .partitionKey(Attribute.builder()
                        .name("Email")
                        .type(AttributeType.STRING)
                        .build())
                .projectionType(ProjectionType.ALL)
                .build());

        // =============================================
        // 2. COURSES TABLE
        // =============================================
        // PK: CourseID (String)
        // Attributes: InstructorID, HonorCodeDocURI, EnrolledStudents, CreatedAt, UpdatedAt
        // GSI: InstructorIndex (PK: InstructorID)
        this.coursesTable = Table.Builder.create(this, "CoursesTable")
                .tableName("DevAi-Courses")
                .partitionKey(Attribute.builder()
                        .name("CourseID")
                        .type(AttributeType.STRING)
                        .build())
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        this.coursesTable.addGlobalSecondaryIndex(GlobalSecondaryIndexProps.builder()
                .indexName("InstructorIndex")
                .partitionKey(Attribute.builder()
                        .name("InstructorID")
                        .type(AttributeType.STRING)
                        .build())
                .projectionType(ProjectionType.ALL)
                .build());

        // =============================================
        // 3. SUBMISSIONS TABLE
        // =============================================
        // PK: SubmissionID (String)
        // Attributes: CourseID, StudentID, Status, Feedback, CreatedAt, UpdatedAt
        // GSI: CourseIndex (PK: CourseID, SK: CreatedAt)
        // GSI: StudentIndex (PK: StudentID, SK: CreatedAt)
        this.submissionsTable = Table.Builder.create(this, "SubmissionsTable")
                .tableName("DevAi-Submissions")
                .partitionKey(Attribute.builder()
                        .name("SubmissionID")
                        .type(AttributeType.STRING)
                        .build())
                .billingMode(BillingMode.PAY_PER_REQUEST)
                .removalPolicy(RemovalPolicy.DESTROY)
                .build();

        this.submissionsTable.addGlobalSecondaryIndex(GlobalSecondaryIndexProps.builder()
                .indexName("CourseIndex")
                .partitionKey(Attribute.builder()
                        .name("CourseID")
                        .type(AttributeType.STRING)
                        .build())
                .sortKey(Attribute.builder()
                        .name("CreatedAt")
                        .type(AttributeType.STRING)
                        .build())
                .projectionType(ProjectionType.ALL)
                .build());

        this.submissionsTable.addGlobalSecondaryIndex(GlobalSecondaryIndexProps.builder()
                .indexName("StudentIndex")
                .partitionKey(Attribute.builder()
                        .name("StudentID")
                        .type(AttributeType.STRING)
                        .build())
                .sortKey(Attribute.builder()
                        .name("CreatedAt")
                        .type(AttributeType.STRING)
                        .build())
                .projectionType(ProjectionType.ALL)
                .build());
    }

    // =============================================
    // PUBLIC ACCESSORS
    // =============================================
    // Other constructs (e.g. ApiConstruct) can use these
    // to grant Lambda permissions or reference table names.

    public Table getUsersTable() {
        return this.usersTable;
    }

    public Table getCoursesTable() {
        return this.coursesTable;
    }

    public Table getSubmissionsTable() {
        return this.submissionsTable;
    }
}
