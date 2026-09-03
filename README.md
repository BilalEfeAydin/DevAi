# DevAI

**A Socratic AI code review platform that guides students to find and fix their own mistakes, instead of just handing them the answer.**

Built for the Amazon University Engagement Program 5.0 mentorship track.

---

## Table of Contents

- [About the Project](#about-the-project)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Live Demo & Demo Accounts](#live-demo--demo-accounts)
- [User Guide](#user-guide)
  - [For Students](#for-students)
  - [For Instructors](#for-instructors)
- [Project Structure](#project-structure)
- [Team](#team)
- [Acknowledgments](#acknowledgments)
- [License](#license)

---

## About the Project

DevAI is a code review platform designed to help university students improve their programming skills while respecting their institution's Honor Code.

Instead of giving students a direct fix when they submit code, DevAI's AI reviewer asks **guiding (Socratic) questions** that push the student to find the issue themselves. This is meant to:

- Encourage genuine learning over copy-pasting a fix.
- Make it harder to pass off AI-generated or plagiarized code as original work.
- Give instructors visibility into how their students are actually progressing, not just whether their code runs.

Instructors can define custom coding rules per course (naming conventions, complexity limits, forbidden practices, required patterns) and upload a course-specific Honor Code document. The AI reviewer enforces both when reviewing submissions.

## Key Features

### For Students
- Accept course invitations by email or shareable link.
- Browse enrolled courses and view course description, expected notions, and rules.
- Submit code to an in-browser editor (multi-file support, syntax highlighting).
- Get Socratic, progressively-specific AI feedback across multiple attempts.
- Track submission history and revisit past attempts.
- Receive real-time notifications for new invitations and new exercises.

### For Instructors
- Register new courses and configure enforcement rules (naming, structure, complexity, forbidden practices, required patterns).
- Upload a course-specific Honor Code document (`.txt`).
- Invite students by email or via a shareable link, and track invitation status.
- Create and manage exercises per course.
- View a dashboard with course/student counts, weekly submission activity, and a "Needs Attention" list of flagged submissions (honor code violations or submissions needing review).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), React Router |
| Auth | Amazon Cognito (User Pools, Groups, JWT) |
| API | Amazon API Gateway (HTTP API) + JWT Authorizer |
| Compute | AWS Lambda (Node.js) |
| Database | Amazon DynamoDB |
| Storage | Amazon S3 (Honor Code documents, rules) |
| AI Review | Amazon Bedrock (Claude) |
| Code Execution | E2B Sandbox |
| Infrastructure as Code | AWS CDK (Java) |
| Hosting | AWS Amplify |

## Architecture
React (Amplify Hosting)
│
▼
Amazon Cognito (Auth) ──► API Gateway (JWT Authorizer)
│
┌────────────────┼─────────────────┐
▼ ▼ ▼
Lambda: Courses Lambda: Submissions Lambda: Users (Cognito trigger)
│ │
▼ ▼
DynamoDB DynamoDB + S3 (rules/honor code)
│
▼
E2B Sandbox (code execution)
│
▼
Amazon Bedrock (AI review)


## Getting Started

DevAI is already deployed and live , you don't need to install anything, clone the repo, or run it locally to try it out.

** Open the Website here: [https://main.d6x1f2oqlv9td.amplifyapp.com/]**

Just open the link and log in with one of the demo accounts below to explore the platform as a student or as an instructor.

> Want to run your own copy locally or deploy your own infrastructure? The frontend is a standard Vite/React app (`npm install` + `npm run dev` from `frontend/`), and the infrastructure is defined as AWS CDK (Java) in the project root (`cdk deploy`). Reach out to the team if you'd like details on setting up your own AWS resources.

## Live Demo & Demo Accounts

Two pre-configured demo accounts are available so you can explore both roles without signing up. Each account already has courses, exercises, and (for the student account) a pending course invitation set up, so you can see the full flow end-to-end.

| Role | Email | Password |
|---|---|---|
| Student | `testDemoStudent@mail.com` | `1Abcdefg.` |
| Instructor | `testDemoInstructor@mail.com` | `2abcdefG.` |

> These accounts are for evaluation purposes only. Please don't change their passwords.

## User Guide

### For Students

1. **Log in** with the student demo account above.
2. From your **Profile**, click **My Courses** to see courses you're enrolled in.
3. Open a course to view its **description, expected notions, and rules** set by the instructor.
4. Go to the **Exercises** tab and pick an exercise to work on.
5. Write your solution in the code editor:
   - **Run Tests** executes your code without using an attempt.
   - **Run & Submit** uses one attempt and sends your code for AI Socratic review.
6. Read the AI reviewer's questions under **Socratic Inquiry** — they'll point you toward the issue without giving away the fix. Revise and resubmit until you pass or run out of attempts.
7. Check the **bell icon** for notifications: you'll be notified of new course invitations and newly opened exercises. The demo student account has a pending invitation waiting to be accepted from there.
8. Use the **past attempt tabs** above the editor to review any previous submission and its feedback.

### For Instructors

1. **Log in** with the instructor demo account above.
2. From your **Profile**, click **Register New Course** to create a new course:
   - Fill in the title and description.
   - Configure enforcement rules: naming conventions, function length/nesting limits, forbidden practices, and required patterns (e.g. docstrings, unit tests).
   - Optionally upload a `.txt` Honor Code document: this becomes the source of truth the AI uses for honor code violations in that course.
3. Open a course and go to the **Students** tab to invite students:
   - Send an invite to a specific email, or
   - Generate a shareable link anyone can use to join.
   - Track invitation status (pending / accepted / declined) in the table below.
4. Go to the **Exercises** tab and click **Create Exercise** to add a new exercise (title, description, badge/category, max attempts, starter code). All already-enrolled students are notified automatically.
5. Visit the **Dashboard** for an overview across all your courses: total courses, total students, weekly submission activity, and a **Needs Attention** list of recent submissions flagged as honor code violations or needing review.

## Project Structure
DevAi/
├── cdk.json                  # CDK app entry config
├── pom.xml                   # Maven config for CDK (Java)
├── package.json              # npm deps for CDK CLI
├── frontend/                 # React (Vite) application
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── src/                  # pages, components, amplifyConfig.js
└── src/
    └── main/java/com/myorg/
        ├── DevAiApp.java      # CDK app entry point
        ├── DevAiStack.java    # Main stack, wires all constructs together
        ├── constructs/        # Database, Storage, Api, Auth, Hosting
        ├── controllers/       # Lambda functions (Node.js)
        │   ├── getCourses/
        │   ├── getSubmission/
        │   ├── postConfirmation/  # Cognito post-confirmation trigger
        │   ├── postCourse/
        │   └── postSubmission/    # Code execution (E2B) + AI review (Bedrock)
        └── test/java/com/myorg/   # CDK stack tests
           
      

> Note: the CDK infrastructure (Java) and the Lambda function code (Node.js) live under the same `src/main/java/com/myorg/` tree , the Lambda folders (`controllers/`, `orchestrator/`) contain plain `.mjs` files bundled and deployed by the CDK constructs; they are not part of the Java build itself.

## Team

| Name | Role |
|---|---|
| Bilal | Backend, infrastructure (CDK/AWS deployment), API integration, demo presentation |
| Ismail | Backend, Lambda functions, API creation |
| Rouae | Frontend, UI/UX, final report |

## Acknowledgments

This project was built as part of Amazon's **University Engagement Program 5.0** mentorship track. Thank you to our mentor for their guidance throughout the sprints.

## License

This project was developed for academic purposes as part of a university mentorship program. All rights reserved by the authors unless otherwise stated.
