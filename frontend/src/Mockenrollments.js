// mockEnrollments.js
// NOTE: in-memory mock "database" – resets on refresh.

const courses = {
  c1: { id: 'c1', title: 'Introduction to Python', instructor: 'Prof. Amrani', color: '#1e2a78' },
  c2: { id: 'c2', title: 'Data Structures & Algorithms', instructor: 'Prof. Bensalah', color: '#7c3aed' },
  c3: { id: 'c3', title: 'Web Development Basics', instructor: 'Prof. Khelifi', color: '#0e9f6e' },
};

// Informational content for existing courses
const courseDetails = {
  c1: {
    description: 'An introductory course covering Python fundamentals through hands-on, AI-reviewed exercises. No prior programming experience required.',
    notions: ['Variables & data types', 'Control flow (loops, conditionals)', 'Functions & scope', 'Basic input/output'],
    rules: ['Submit only your own work', 'No sharing code with classmates during graded exercises', 'Use clear, descriptive variable names'],
    tips: ['Practice a little every day rather than cramming', 'Read the Socratic questions carefully before asking for help', 'Review your past attempts before resubmitting'],
  },
  c2: {
    description: 'Covers core data structures and algorithms, with an emphasis on complexity analysis and implementation from scratch.',
    notions: ['Arrays & linked lists', 'Trees & balancing (e.g. red-black trees)', 'Sorting & searching', 'Big-O complexity analysis'],
    rules: ['Implement algorithms without external libraries unless stated', 'Explain your reasoning in code comments', 'Cite any references used for approach (not code)'],
    tips: ['Draw the structure out on paper before coding', 'Trace through small examples by hand first', 'Focus on correctness before optimizing'],
  },
  c3: {
    description: 'A hands-on introduction to building for the web: HTML, CSS, and core JavaScript concepts.',
    notions: ['Semantic HTML', 'CSS layout (flexbox/grid)', 'DOM manipulation', 'Responsive design basics'],
    rules: ['Validate your HTML/CSS before submitting', 'No copy-pasting full components from tutorials', 'Test in at least one real browser, not just the sandbox'],
    tips: ['Inspect real websites to see how they structure markup', 'Build mobile-first, then adapt for desktop', 'Keep a personal snippet library of patterns you reuse'],
  },
};

// Student-side access status (used by CoursePicker)
const studentCourseStatus = {
  c1: 'accepted',
  c2: 'accepted',
  c3: 'pending',
};

// Teacher-side invitations store
let invitations = [
  {
    id: 'inv-1',
    courseId: 'c3',
    email: 'newstudent@example.com',
    status: 'pending',
    token: 'demo-token-c3',
    createdAt: '2026-08-10T09:00:00Z',
  },
];

let invitationCounter = invitations.length;
let courseCounter = 3; // start after c3

function generateToken() {
  return `tok-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================
// COURSE REGISTRATION (Instructor)
// ============================================================

export function registerCourse(data) {
  const { title, description, instructorName, rules, honorCodeText } = data;
  // generate new course id
  const id = `c${++courseCounter}`;
  const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  const newCourse = {
    id,
    title,
    instructor: instructorName || 'Instructor',
    color,
    rules, // store the full rule config
    // NOTE (flagged deliberately): mock only. Real HonorCodeDocURI (see
    // DatabaseConstruct.java) is meant to hold an S3 URI, NOT raw text --
    // DynamoDB items are capped at 400KB, and a syllabus/honor-code doc can
    // exceed that as the course grows. The real flow: frontend uploads the
    // raw file to honorCodeBucket (already provisioned in
    // StorageConstruct.java, CORS-enabled for PUT) via a presigned URL, and
    // ONLY the resulting S3 URI gets written to HonorCodeDocURI. That
    // Lambda route (POST /courses/:id/honor-code-upload-url) doesn't exist
    // yet -- ApiConstruct.java has zero routes for it. Storing the text
    // here directly is a stopgap so the UI/UX is complete and testable.
    honorCodeText: honorCodeText || null,
  };
  courses[id] = newCourse;

  // Also store courseDetails for the Overview tab
  courseDetails[id] = {
    description: description || 'No description provided.',
    notions: generateNotionsFromRules(rules),
    rules: generateRulesFromRules(rules),
    tips: ['Follow the course guidelines.', 'Read the Socratic questions carefully.', 'Review your past attempts.'],
  };

  // default student access: pending until they accept
  studentCourseStatus[id] = 'pending';

  return newCourse;
}

// NOTE (flagged deliberately): generateNotionsFromRules / generateRulesFromRules
// below produce DISPLAY-ONLY text for the Overview tab. None of this --
// neither the structured `rules` object nor `honorCodeText` -- reaches
// Bedrock. The AI review pipeline (postSubmission Lambda, see
// ApiConstruct.java) still uses a hardcoded honor code string. Frontend has
// nothing further to do here: it already sends `courseId` on every
// submission (see Submission.jsx handleRunTests). Wiring this for real is a
// BACKEND task: postSubmission must fetch Courses.HonorCodeDocURI (+ rules,
// once a storage decision is made for those) by courseId and inject them
// into the Bedrock prompt, replacing the hardcoded string.

// Helper functions to convert rule config into display-friendly items
function generateNotionsFromRules(rules) {
  const notions = [];
  if (rules.naming.camelCase || rules.naming.PascalCase || rules.naming.UPPER_CASE || rules.naming.custom.length) {
    notions.push('Understanding naming conventions');
  }
  if (rules.structure.functionLengthLimit) {
    notions.push('Writing concise functions');
  }
  if (rules.structure.maxNestingLevels) {
    notions.push('Controlling nesting depth');
  }
  if (rules.complexity.cyclomaticLimit) {
    notions.push('Managing cyclomatic complexity');
  }
  if (rules.required.docstrings) {
    notions.push('Writing docstrings for public methods');
  }
  if (rules.required.unitTests) {
    notions.push('Writing unit tests');
  }
  if (notions.length === 0) notions.push('General programming principles');
  return notions;
}

function generateRulesFromRules(rules) {
  const ruleTexts = [];
  if (rules.naming.camelCase) ruleTexts.push('Use camelCase for variables.');
  if (rules.naming.PascalCase) ruleTexts.push('Use PascalCase for classes.');
  if (rules.naming.UPPER_CASE) ruleTexts.push('Use UPPER_CASE for constants.');
  rules.naming.custom.forEach(r => ruleTexts.push(`Custom naming: ${r}`));
  if (rules.structure.functionLengthLimit) {
    ruleTexts.push(`Functions must not exceed ${rules.structure.functionLengthLimit} lines.`);
  }
  if (rules.structure.maxNestingLevels) {
    ruleTexts.push(`Nesting levels must not exceed ${rules.structure.maxNestingLevels}.`);
  }
  if (rules.complexity.cyclomaticLimit) {
    ruleTexts.push(`Cyclomatic complexity should not exceed ${rules.complexity.cyclomaticLimit}.`);
  }
  if (rules.forbidden.globalVariables) ruleTexts.push('Global variables are forbidden.');
  if (rules.forbidden.hardcodedSecrets) ruleTexts.push('Hardcoded secrets are forbidden.');
  rules.forbidden.custom.forEach(r => ruleTexts.push(`Forbidden: ${r}`));
  if (rules.required.docstrings) ruleTexts.push('All public methods must have docstrings.');
  if (rules.required.unitTests) ruleTexts.push('Core logic must have unit tests.');
  rules.required.custom.forEach(r => ruleTexts.push(`Required: ${r}`));
  if (ruleTexts.length === 0) ruleTexts.push('Follow standard coding practices.');
  return ruleTexts;
}

// ============================================================
// STUDENT-FACING
// ============================================================

export function getAllEnrollments() {
  return Object.values(courses).map((c) => ({
    ...c,
    status: studentCourseStatus[c.id] || 'pending',
  }));
}

export function getInvitationByToken(token) {
  const invite = invitations.find((i) => i.token === token);
  if (!invite) return null;
  const course = courses[invite.courseId];
  if (!course) return null;
  return {
    courseId: invite.courseId,
    courseTitle: course.title,
    instructorName: course.instructor,
    status: studentCourseStatus[invite.courseId] || 'pending',
    email: invite.email,
  };
}

export function acceptInvitation(token) {
  const invite = invitations.find((i) => i.token === token);
  if (!invite) return null;
  invite.status = 'accepted';
  studentCourseStatus[invite.courseId] = 'accepted';
  return courses[invite.courseId];
}

export function declineInvitation(token) {
  const invite = invitations.find((i) => i.token === token);
  if (!invite) return null;
  invite.status = 'declined';
  studentCourseStatus[invite.courseId] = 'declined';
  return courses[invite.courseId];
}

export function attachEmailToInvitation(token, email) {
  const invite = invitations.find((i) => i.token === token);
  if (!invite) return null;
  if (!invite.email && email) {
    invite.email = email;
  }
  return invite;
}

// ============================================================
// TEACHER-FACING
// ============================================================

export function getCourseInfo(courseId) {
  return courses[courseId] || null;
}

export function getCourseDetails(courseId) {
  return courseDetails[courseId] || null;
}

export function getInvitationsForCourse(courseId) {
  return invitations
    .filter((i) => i.courseId === courseId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function sendInvitationByEmail(courseId, email) {
  invitationCounter += 1;
  const newInvite = {
    id: `inv-${invitationCounter}`,
    courseId,
    email,
    status: 'pending',
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };
  invitations.push(newInvite);
  return newInvite;
}

export function generateShareableLink(courseId) {
  invitationCounter += 1;
  const newInvite = {
    id: `inv-${invitationCounter}`,
    courseId,
    email: null,
    status: 'pending',
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };
  invitations.push(newInvite);
  return newInvite;
}

export function getAllCourses() {
  return Object.values(courses);
}