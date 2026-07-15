package com.myorg.constructs;

import java.util.Map;

import software.constructs.Construct;
import software.amazon.awscdk.SecretValue;
import software.amazon.awscdk.services.amplify.CfnApp;
import software.amazon.awscdk.services.amplify.CfnBranch;

/**
 * CDK Construct that provisions AWS Amplify Hosting for DevAi:
 * - Connects to GitHub repo (BilalEfeAydin/DevAi)
 * - Auto-deploys on push to main (production) and Dev (preview)
 * - Builds the Vite React app from the frontend/ directory
 *
 * Requires a GitHub personal access token stored in
 * AWS Secrets Manager under the key "devai/github-token".
 */
public class HostingConstruct extends Construct {

    private final CfnApp amplifyApp;
    private final CfnBranch mainBranch;
    private final CfnBranch devBranch;

    public HostingConstruct(final Construct scope, final String id) {
        super(scope, id);

        // Build specification embedded in CDK (no amplify.yml file needed).
        // Amplify uses this to build the Vite React app from frontend/.
        final String buildSpec = String.join("\n",
                "version: 1",
                "applications:",
                "  - frontend:",
                "      phases:",
                "        preBuild:",
                "          commands:",
                "            - cd frontend",
                "            - npm ci",
                "        build:",
                "          commands:",
                "            - npm run build",
                "      artifacts:",
                "        baseDirectory: frontend/dist",
                "        files:",
                "          - '**/*'",
                "      cache:",
                "        paths:",
                "          - frontend/node_modules/**/*",
                "    appRoot: ."
        );

        // =============================================
        // AMPLIFY APP
        // =============================================
        this.amplifyApp = CfnApp.Builder.create(this, "AmplifyApp")
                .name("DevAi")
                .repository("https://github.com/BilalEfeAydin/DevAi")
                .oauthToken(SecretValue.secretsManager("GitHubTokenAmplify").unsafeUnwrap())
                .buildSpec(buildSpec)
                .environmentVariables(java.util.List.of(
                        CfnApp.EnvironmentVariableProperty.builder()
                                .name("VITE_APP_NAME")
                                .value("DevAi")
                                .build()
                ))
                .build();

        // =============================================
        // BRANCH: main (Production)
        // =============================================
        this.mainBranch = CfnBranch.Builder.create(this, "MainBranch")
                .appId(this.amplifyApp.getAttrAppId())
                .branchName("main")
                .enableAutoBuild(true)
                .stage("PRODUCTION")
                .build();

        // =============================================
        // BRANCH: Dev (Preview / Staging)
        // =============================================
        this.devBranch = CfnBranch.Builder.create(this, "DevBranch")
                .appId(this.amplifyApp.getAttrAppId())
                .branchName("Dev")
                .enableAutoBuild(true)
                .stage("DEVELOPMENT")
                .build();
    }

    // =============================================
    // PUBLIC ACCESSORS
    // =============================================

    public CfnApp getAmplifyApp() {
        return this.amplifyApp;
    }

    public String getAppId() {
        return this.amplifyApp.getAttrAppId();
    }

    public String getDefaultDomain() {
        return this.amplifyApp.getAttrDefaultDomain();
    }
}
