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

// Student-side: does the test student have access to each course?
const studentCourseStatus = {
  c1: 'accepted',
  c2: 'accepted',
  c3: 'pending',
};

// Teacher-side: one record per invited email, or per generated shareable
// link (email: null in that case). This is what InstructorCourseOverview
// reads/writes, and what AcceptInvitation looks up by token.
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

// ============================================================
// TEACHER-FACING (used by InstructorCourseOverview.jsx)
// ============================================================

export function getCourseInfo(courseId) {
  return courses[courseId] || null;
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
    email: null, // not tied to one student -- anyone with the link can accept
    status: 'pending',
    token: generateToken(),
    createdAt: new Date().toISOString(),
  };
  invitations.push(newInvite);
  return newInvite;
}