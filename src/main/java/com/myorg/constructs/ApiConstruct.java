package com.myorg.constructs;

import java.util.List;
import java.util.Map;

import software.constructs.Construct;
import software.amazon.awscdk.Duration;
import software.amazon.awscdk.CfnOutput;
import software.amazon.awscdk.SecretValue;
import software.amazon.awscdk.services.lambda.Function;
import software.amazon.awscdk.services.lambda.Runtime;
import software.amazon.awscdk.services.lambda.Code;
import software.amazon.awscdk.services.dynamodb.Table;

import software.amazon.awscdk.services.apigatewayv2.CfnApi;
import software.amazon.awscdk.services.apigatewayv2.CfnStage;
import software.amazon.awscdk.services.apigatewayv2.CfnRoute;
import software.amazon.awscdk.services.apigatewayv2.CfnIntegration;
import software.amazon.awscdk.services.apigatewayv2.CfnAuthorizer;

import software.amazon.awscdk.services.iam.PolicyStatement;
import software.amazon.awscdk.services.iam.Effect;

/**
 * CDK Construct that provisions the API layer for DevAi:
 * - Three Lambda functions (getSubmission, postSubmission, orchestrator)
 * - HTTP API Gateway with routes
 * - Cognito JWT authorizer
 * - IAM permissions for DynamoDB access
 */
public class ApiConstruct extends Construct {

    private final CfnApi httpApi;
    private final Function getSubmissionFn;
    private final Function postSubmissionFn;
    private final Function orchestratorFn;

    public ApiConstruct(final Construct scope, final String id, final Table submissionsTable) {
        super(scope, id);

        // =============================================
        // 1. LAMBDA FUNCTIONS
        // =============================================

        // GET /submissions — reads from DynamoDB
        this.getSubmissionFn = Function.Builder.create(this, "GetSubmissionFn")
                .functionName("DevAi-GetSubmission")
                .runtime(Runtime.NODEJS_24_X)
                .handler("index.handler")
                .code(Code.fromAsset("src/main/java/controllers/getSubmission"))
                .timeout(Duration.seconds(10))
                .environment(Map.of("TABLE_NAME", submissionsTable.getTableName()))
                .build();

        // POST /submissions — writes to DynamoDB + runs code in E2B sandbox
        this.postSubmissionFn = Function.Builder.create(this, "PostSubmissionFn")
                .functionName("DevAi-PostSubmission")
                .runtime(Runtime.NODEJS_24_X)
                .handler("index.handler")
                .code(Code.fromAsset("src/main/java/controllers/postSubmission"))
                .timeout(Duration.seconds(25))
                .memorySize(512)
                .environment(Map.of(
                        "TABLE_NAME", submissionsTable.getTableName(),
                        "E2B_API_KEY", SecretValue.secretsManager("E2BApiKey").unsafeUnwrap()
                ))
                .build();

        // GET /orchestrator — stub that reads Cognito JWT claims
        this.orchestratorFn = Function.Builder.create(this, "OrchestratorFn")
                .functionName("DevAi-Orchestrator")
                .runtime(Runtime.NODEJS_24_X)
                .handler("index.handler")
                .code(Code.fromAsset("src/main/java/orchestrator/OrchestratorLambda"))
                .timeout(Duration.seconds(10))
                .build();

        // =============================================
        // 2. IAM PERMISSIONS
        // =============================================
        // Grant the controller Lambdas read/write access to the Submissions table + indexes
        submissionsTable.grantReadData(this.getSubmissionFn);
        submissionsTable.grantReadWriteData(this.postSubmissionFn);

        // =============================================
        // 3. HTTP API GATEWAY (using L1 CfnApi)
        // =============================================
        this.httpApi = CfnApi.Builder.create(this, "HttpApi")
                .name("DevAi-Api")
                .protocolType("HTTP")
                .corsConfiguration(CfnApi.CorsProperty.builder()
                        .allowOrigins(List.of("*"))
                        .allowMethods(List.of("GET", "POST", "OPTIONS"))
                        .allowHeaders(List.of("Content-Type", "Authorization"))
                        .build())
                .build();

        // Auto-deploy stage
        CfnStage stage = CfnStage.Builder.create(this, "ApiStage")
                .apiId(this.httpApi.getRef())
                .stageName("$default")
                .autoDeploy(true)
                .build();

        // =============================================
        // 4. COGNITO JWT AUTHORIZER
        // =============================================
        CfnAuthorizer jwtAuthorizer = CfnAuthorizer.Builder.create(this, "CognitoAuthorizer")
                .apiId(this.httpApi.getRef())
                .name("CognitoJwtAuthorizer")
                .authorizerType("JWT")
                .identitySource(List.of("$request.header.Authorization"))
                .jwtConfiguration(CfnAuthorizer.JWTConfigurationProperty.builder()
                        .issuer("https://cognito-idp.us-east-1.amazonaws.com/us-east-1_miUx3W5Cq")
                        .audience(List.of("kvq8aeovmcat8uoncb9odset6"))
                        .build())
                .build();

        String authorizerId = jwtAuthorizer.getRef();

        // =============================================
        // 5. INTEGRATIONS (Lambda proxy)
        // =============================================
        CfnIntegration getIntegration = CfnIntegration.Builder.create(this, "GetSubmissionIntegration")
                .apiId(this.httpApi.getRef())
                .integrationType("AWS_PROXY")
                .integrationUri(this.getSubmissionFn.getFunctionArn())
                .payloadFormatVersion("2.0")
                .build();

        CfnIntegration postIntegration = CfnIntegration.Builder.create(this, "PostSubmissionIntegration")
                .apiId(this.httpApi.getRef())
                .integrationType("AWS_PROXY")
                .integrationUri(this.postSubmissionFn.getFunctionArn())
                .payloadFormatVersion("2.0")
                .build();

        CfnIntegration orchestratorIntegration = CfnIntegration.Builder.create(this, "OrchestratorIntegration")
                .apiId(this.httpApi.getRef())
                .integrationType("AWS_PROXY")
                .integrationUri(this.orchestratorFn.getFunctionArn())
                .payloadFormatVersion("2.0")
                .build();

        // =============================================
        // 6. ROUTES
        // =============================================
        CfnRoute.Builder.create(this, "GetSubmissionsRoute")
                .apiId(this.httpApi.getRef())
                .routeKey("GET /submissions")
                .target("integrations/" + getIntegration.getRef())
                .authorizationType("JWT")
                .authorizerId(authorizerId)
                .build();

        CfnRoute.Builder.create(this, "PostSubmissionsRoute")
                .apiId(this.httpApi.getRef())
                .routeKey("POST /submissions")
                .target("integrations/" + postIntegration.getRef())
                .authorizationType("JWT")
                .authorizerId(authorizerId)
                .build();

        CfnRoute.Builder.create(this, "OrchestratorRoute")
                .apiId(this.httpApi.getRef())
                .routeKey("GET /orchestrator")
                .target("integrations/" + orchestratorIntegration.getRef())
                .authorizationType("JWT")
                .authorizerId(authorizerId)
                .build();

        // =============================================
        // 7. LAMBDA INVOKE PERMISSIONS (allow API Gateway to call the Lambdas)
        // =============================================
        this.getSubmissionFn.addPermission("ApiGwInvoke", software.amazon.awscdk.services.lambda.Permission.builder()
                .principal(new software.amazon.awscdk.services.iam.ServicePrincipal("apigateway.amazonaws.com"))
                .sourceArn("arn:aws:execute-api:"
                        + software.amazon.awscdk.Stack.of(this).getRegion() + ":"
                        + software.amazon.awscdk.Stack.of(this).getAccount() + ":"
                        + this.httpApi.getRef() + "/*/*")
                .build());

        this.postSubmissionFn.addPermission("ApiGwInvoke", software.amazon.awscdk.services.lambda.Permission.builder()
                .principal(new software.amazon.awscdk.services.iam.ServicePrincipal("apigateway.amazonaws.com"))
                .sourceArn("arn:aws:execute-api:"
                        + software.amazon.awscdk.Stack.of(this).getRegion() + ":"
                        + software.amazon.awscdk.Stack.of(this).getAccount() + ":"
                        + this.httpApi.getRef() + "/*/*")
                .build());

        this.orchestratorFn.addPermission("ApiGwInvoke", software.amazon.awscdk.services.lambda.Permission.builder()
                .principal(new software.amazon.awscdk.services.iam.ServicePrincipal("apigateway.amazonaws.com"))
                .sourceArn("arn:aws:execute-api:"
                        + software.amazon.awscdk.Stack.of(this).getRegion() + ":"
                        + software.amazon.awscdk.Stack.of(this).getAccount() + ":"
                        + this.httpApi.getRef() + "/*/*")
                .build());
    }

    // =============================================
    // PUBLIC ACCESSORS
    // =============================================

    public String getApiUrl() {
        return this.httpApi.getAttrApiEndpoint();
    }

    public Function getGetSubmissionFn() {
        return this.getSubmissionFn;
    }

    public Function getPostSubmissionFn() {
        return this.postSubmissionFn;
    }

    public Function getOrchestratorFn() {
        return this.orchestratorFn;
    }
}
