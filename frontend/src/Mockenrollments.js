// mockEnrollments.js
// NOTE (flagged deliberately): tiny in-memory mock "database" so
// CoursePicker.jsx, AcceptInvitation.jsx and InstructorCourseOverview.jsx
// stay in sync during local testing, since there's no real Enrollment API
// yet (Trello: "Build Enrollment API" — not started). Replace with real
// fetch/PATCH calls (GET/POST/PATCH /courses/:id/invitations) once that
// backend exists. Resets on every page refresh (module-level state, not
// persisted).
//
// SIMPLIFICATION (flagged deliberately): studentCourseStatus tracks ONE
// global status per course ("does the current test student have access"),
// not a per-student status. That's enough for testing the Accept/Decline
// flow with a single logged-in student, but the real Enrollment API will
// need per-(student, course) status, not per-course.

const courses = {
  c1: { id: 'c1', title: 'Introduction to Python', instructor: 'Prof. Amrani', color: '#1e2a78' },
  c2: { id: 'c2', title: 'Data Structures & Algorithms', instructor: 'Prof. Bensalah', color: '#7c3aed' },
  c3: { id: 'c3', title: 'Web Development Basics', instructor: 'Prof. Khelifi', color: '#0e9f6e' },
};

// NOTE (flagged deliberately): informational course-level content for the
// instructor "Overview" tab (description, notions to learn, general
// rules, tips). This is DIFFERENT from the Rule Configuration mockup
// (Naming Conventions / Forbidden Practices / etc.) -- that config is
// per-exercise and gets injected into the Bedrock prompt. This content
// here is just informational text shown to students, not sent to the AI.
// Replace with a real fetch (e.g. GET /courses/:id) once the Courses API
// exists.
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

// Student-side: does the test student have access to each course?
const studentCourseStatus = {
  c1: 'accepted',
  c2: 'accepted',
  c3: 'pending',
};

// Teacher-side: one record per invited email, or per generated shareable
// link (email: null until a student actually opens it while logged in --
// see attachEmailToInvitation below).
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

function generateToken() {
  return `tok-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================
// STUDENT-FACING (used by CoursePicker.jsx / AcceptInvitation.jsx)
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
    email: invite.email, // null if this is still a generic, unused shareable link
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

// NEW: called once a student opens a generic shareable link WHILE logged
// in, so the instructor sees the real email instead of a placeholder.
// Only fills it in if it was still empty (email-specific invites already
// have one and shouldn't be overwritten).
export function attachEmailToInvitation(token, email) {
  const invite = invitations.find((i) => i.token === token);
  if (!invite) return null;
  if (!invite.email && email) {
    invite.email = email;
  }
  return invite;
}

// ============================================================
// TEACHER-FACING (used by InstructorCourseOverview.jsx)
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
    email: null, // becomes the real student's email once they open it (see attachEmailToInvitation)
    status: 'pending',
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };
  invitations.push(newInvite);
  return newInvite;
}