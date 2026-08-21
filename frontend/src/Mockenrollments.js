// mockEnrollments.js
import { addNotification } from './MockNotifications';

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

// ============================================================
// EXERCISE STORE (mock)
// ============================================================
// NOTE (flagged deliberately):
// Exercise data is currently frontend-only mock data.
// The Exercises API is not wired yet.
// This store will later be replaced/connected to:
//   GET /courses/:courseId/exercises
//   POST /courses/:courseId/exercises
//   PATCH /courses/:courseId/exercises/:exerciseId
let exercises = {
  c1: [
    {
      id: 'e1',
      courseId: 'c1',
      title: 'Variables & Data Types',
      description: "Practice declaring variables and using Python's core data types.",
      badge: 'Fundamentals',
      maxAttempts: 5,
      starterCode: '# Declare a variable named "age" and print it\n\n',
    },
    {
      id: 'e2',
      courseId: 'c1',
      title: 'Loops & Conditionals',
      description: 'Implement common loop and conditional patterns.',
      badge: 'Control Flow',
      maxAttempts: 5,
      starterCode: '# Write a for loop that prints numbers 1 to 10\n\n',
    },
  ],
  c2: [
    {
      id: 'e3',
      courseId: 'c2',
      title: 'Red-Black Tree Insertion',
      description: 'Implement the self-balancing binary search tree insertion algorithm.',
      badge: 'Algorithm Design',
      maxAttempts: 5,
      starterCode: 'class RedBlackTree:\n    def __init__(self):\n        self.NIL = Node(0, color="BLACK")\n        self.root = self.NIL\n\n    def insert(self, key):\n        # Your implementation here\n        pass\n',
    },
    {
      id: 'e4',
      courseId: 'c2',
      title: 'Binary Search',
      description: 'Implement binary search on a sorted array.',
      badge: 'Algorithm Design',
      maxAttempts: 5,
      starterCode: 'def binary_search(arr, target):\n    # Your implementation here\n    pass\n',
    },
  ],
  c3: [
    {
      id: 'e5',
      courseId: 'c3',
      title: 'Build a Nav Bar',
      description: 'Create a responsive navigation bar.',
      badge: 'HTML/CSS',
      maxAttempts: 5,
      starterCode: '<!-- Your HTML here -->\n',
    },
  ],
};
let exerciseCounter = 5; // after e5

// ============================================================
// EXERCISE FUNCTIONS
// ============================================================

export function getExercisesForCourse(courseId) {
  return exercises[courseId] || [];
}

export function getExerciseById(exerciseId) {
  for (const courseId in exercises) {
    const ex = exercises[courseId].find((e) => e.id === exerciseId);
    if (ex) return ex;
  }
  return null;
}

export function addExercise(courseId, exerciseData) {
  if (!exercises[courseId]) exercises[courseId] = [];
  exerciseCounter += 1;
  const newExercise = {
    id: `e${exerciseCounter}`,
    courseId,
    ...exerciseData,
  };
  exercises[courseId].push(newExercise);

  // Notify all accepted students for this course
  const acceptedInvites = invitations.filter(
    (inv) => inv.courseId === courseId && inv.status === 'accepted' && inv.email
  );
  acceptedInvites.forEach((inv) => {
    addNotification(inv.email, 'new_exercise', {
      courseId,
      courseTitle: courses[courseId]?.title || 'Course',
      exerciseId: newExercise.id,
      exerciseTitle: newExercise.title,
    });
  });

  return newExercise;
}

// ============================================================
// (existing functions below)
// ============================================================

function generateToken() {
  return `tok-${Math.random().toString(36).slice(2, 10)}`;
}

// ============================================================
// COURSE REGISTRATION (Instructor)
// ============================================================

export function registerCourse(data) {
  const { title, description, instructorName, rules, honorCodeText } = data;
  const id = `c${++courseCounter}`;
  const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
  const newCourse = {
    id,
    title,
    instructor: instructorName || 'Instructor',
    color,
    rules,
    honorCodeText: honorCodeText || null,
  };
  courses[id] = newCourse;

  courseDetails[id] = {
    description: description || 'No description provided.',
    notions: generateNotionsFromRules(rules),
    rules: generateRulesFromRules(rules),
    tips: ['Follow the course guidelines.', 'Read the Socratic questions carefully.', 'Review your past attempts.'],
  };

  studentCourseStatus[id] = 'pending';

  return newCourse;
}

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

  // Add notification for the invited student
  addNotification(email, 'invitation', {
    courseId,
    courseTitle: courses[courseId]?.title || 'Course',
    instructorName: courses[courseId]?.instructor || 'Instructor',
    token: newInvite.token,
  });

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