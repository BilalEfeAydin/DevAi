package com.myorg.constructs;

import java.util.List;

import software.constructs.Construct;
import software.amazon.awscdk.RemovalPolicy;
import software.amazon.awscdk.services.s3.BlockPublicAccess;
import software.amazon.awscdk.services.s3.Bucket;
import software.amazon.awscdk.services.s3.BucketEncryption;
import software.amazon.awscdk.services.s3.CorsRule;
import software.amazon.awscdk.services.s3.HttpMethods;

/**
 * CDK Construct that provisions S3 buckets for DevAi:
 * - Honor Code Documents bucket (versioned, for instructor uploads)
 * - Student Submissions bucket (for code file uploads)
 *
 * Both buckets block all public access, use SSE-S3 encryption,
 * and enable CORS for presigned URL uploads from the frontend.
 * Removal policy is DESTROY with auto-delete for development.
 */
public class StorageConstruct extends Construct {

    private final Bucket honorCodeBucket;
    private final Bucket submissionsBucket;

    public StorageConstruct(final Construct scope, final String id) {
        super(scope, id);

        // CORS rule for presigned URL uploads from the frontend.
        // In production, restrict allowedOrigins to the Amplify domain.
        final CorsRule uploadCorsRule = CorsRule.builder()
                .allowedMethods(List.of(HttpMethods.GET, HttpMethods.PUT))
                .allowedOrigins(List.of("*"))
                .allowedHeaders(List.of("*"))
                .build();

        // =============================================
        // 1. HONOR CODE DOCUMENTS BUCKET
        // =============================================
        // Versioned — instructors may update honor code docs.
        // Key pattern: {courseId}/honor-code.pdf
        this.honorCodeBucket = Bucket.Builder.create(this, "HonorCodeDocsBucket")
                .bucketName("devai-honor-code-docs")
                .versioned(true)
                .encryption(BucketEncryption.S3_MANAGED)
                .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
                .cors(List.of(uploadCorsRule))
                .removalPolicy(RemovalPolicy.DESTROY)
                .autoDeleteObjects(true)
                .build();

        // =============================================
        // 2. STUDENT SUBMISSIONS BUCKET
        // =============================================
        // Not versioned — each submission gets a unique SubmissionID.
        // Key pattern: {studentId}/{submissionId}/code.zip
        this.submissionsBucket = Bucket.Builder.create(this, "SubmissionsBucket")
                .bucketName("devai-submissions")
                .versioned(false)
                .encryption(BucketEncryption.S3_MANAGED)
                .blockPublicAccess(BlockPublicAccess.BLOCK_ALL)
                .cors(List.of(uploadCorsRule))
                .removalPolicy(RemovalPolicy.DESTROY)
                .autoDeleteObjects(true)
                .build();
    }

    // =============================================
    // PUBLIC ACCESSORS
    // =============================================

    public Bucket getHonorCodeBucket() {
        return this.honorCodeBucket;
    }

    public Bucket getSubmissionsBucket() {
        return this.submissionsBucket;
    }
}
