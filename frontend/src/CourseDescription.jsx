import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './theme';
import Sidebar from './Sidebar';
import {
   BookIcon, CapIcon, BellIcon,
  HelpIcon, MenuIcon, SettingsIcon, ArrowIcon
} from './icons';

// NOTE (flagged deliberately): mocked exercises, same placeholder pattern as
// CoursePicker.jsx's `courses` array. Replace with a real fetch
// (e.g. GET /courses/:id/exercises) once that backend piece exists.
const exercisesByCourse = {
  c1: [
    { id: 'e1', title: 'Variables & Data Types', badge: 'Fundamentals', description: "Practice declaring variables and using Python's core data types.", maxAttempts: 5, starterCode: '# Declare a variable named "age" and print it\n\n' },
    { id: 'e2', title: 'Loops & Conditionals', badge: 'Control Flow', description: 'Implement common loop and conditional patterns.', maxAttempts: 5, starterCode: '# Write a for loop that prints numbers 1 to 10\n\n' },
  ],
  c2: [
    { id: 'e3', title: 'Red-Black Tree Insertion', badge: 'Algorithm Design', description: 'Implement the self-balancing binary search tree insertion algorithm.', maxAttempts: 5, starterCode: 'class RedBlackTree:\n    def __init__(self):\n        self.NIL = Node(0, color="BLACK")\n        self.root = self.NIL\n\n    def insert(self, key):\n        # Your implementation here\n        pass\n' },
    { id: 'e4', title: 'Binary Search', badge: 'Algorithm Design', description: 'Implement binary search on a sorted array.', maxAttempts: 5, starterCode: 'def binary_search(arr, target):\n    # Your implementation here\n    pass\n' },
  ],
  c3: [
    { id: 'e5', title: 'Build a Nav Bar', badge: 'HTML/CSS', description: 'Create a responsive navigation bar.', maxAttempts: 5, starterCode: '<!-- Your HTML here -->\n' },
  ],
};

const hoverCSS = `
  .exerciseCard {
    transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
  }
  .exerciseCard:hover {
    box-shadow: 0 8px 20px rgba(30, 42, 120, 0.14);
    transform: translateY(-2px);
    border-color: ${NAVY};
  }
`;

function CourseDescription() {
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = location.state?.courseId;
  const courseTitle = location.state?.courseTitle || 'Course';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view, setView] = useState('course'); // 'course' | 'exercises'
   const [firstName, setFirstName] = useState('');
const [lastName, setLastName] = useState('');
const [loadingProfile, setLoadingProfile] = useState(true);

useEffect(() => {
  async function loadProfile() {
    try {
      const attrs = await fetchUserAttributes();
      setFirstName(attrs.name || '');
      setLastName(attrs.family_name || '');
    } catch (err) {
      console.warn('Could not load profile attributes:', err);
    } finally {
      setLoadingProfile(false);
    }
  }
  loadProfile();
}, []);

const getInitials = () => {
  const first = firstName.charAt(0).toUpperCase();
  const last = lastName.charAt(0).toUpperCase();
  return first + last || '?';
};
  const exercises = exercisesByCourse[courseId] || [];

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login');
    }
  };

  const navItems = [
    {
      label: 'Course', icon: <BookIcon />, active: view === 'course', disabled: false,
      onClick: () => { setView('course'); closeSidebar(); },
    },
    {
      label: 'Exercises', icon: <CapIcon />, active: view === 'exercises', disabled: false,
      onClick: () => { setView('exercises'); closeSidebar(); },
    },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];

 const handleSelectExercise = (exercise) => {
  navigate('/submission', {
    state: {
      courseId,
      courseTitle,
      exerciseId: exercise.id,
      exerciseTitle: exercise.title,
      exerciseDescription: exercise.description,
      exerciseBadge: exercise.badge,
      maxAttempts: exercise.maxAttempts,
      starterCode: exercise.starterCode,
    },
  });
};

  return (
    <div style={styles.page}>
      <style>{hoverCSS}</style>

      <Sidebar
        subtitle={courseTitle}
        navItems={navItems}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onLogout={handleLogout}
      />

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button type="button" onClick={toggleSidebar} style={styles.hamburgerButton}>
              <MenuIcon />
            </button>
            <h1 style={styles.pageTitle}>{view === 'course' ? 'Course Details' : 'Exercises'}</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate('/profile/student')}>
  {loadingProfile ? '...' : getInitials()}
</span>
          </div>
        </header>

        {view === 'course' && (
          <div style={styles.courseCard}>
            <span style={styles.courseIcon}><BookIcon /></span>
            <div>
              <h2 style={styles.courseTitle}>{courseTitle}</h2>
              <p style={styles.courseMeta}>Instructor profile coming soon</p>
              <p style={styles.courseDescription}>
                This course covers the fundamentals through hands-on exercises reviewed
                by DevAI's Socratic AI reviewer. Pick an exercise from the sidebar to get started.
              </p>
              <button type="button" onClick={() => setView('exercises')} style={styles.primaryButton}>
                View Exercises <ArrowIcon />
              </button>
            </div>
          </div>
        )}

        {view === 'exercises' && (
          <div style={styles.exerciseGrid}>
            {exercises.length === 0 && (
              <p style={styles.emptyText}>No exercises have been opened for this course yet.</p>
            )}
            {exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="exerciseCard"
                onClick={() => handleSelectExercise(exercise)}
                style={styles.exerciseCard}
              >
                <div style={styles.exerciseTopRow}>
                  <span style={styles.exerciseBadge}>{exercise.badge}</span>
                  <span style={styles.exerciseArrow}><ArrowIcon /></span>
                </div>
                <div style={styles.exerciseTitle}>{exercise.title}</div>
                <div style={styles.exerciseDescriptionText}>{exercise.description}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', background: '#f5f7fb', fontFamily: 'system-ui, -apple-system, sans-serif' },
  main: { flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  hamburgerButton: { background: 'none', border: 'none', color: NAVY, cursor: 'pointer', display: 'flex', padding: '0.2rem', borderRadius: '6px' },
  pageTitle: { color: '#1a1a1a', fontSize: '1.5rem', fontWeight: 800, margin: 0 },
  headerIcons: { display: 'flex', alignItems: 'center', gap: '1rem' },
  headerIconButton: { color: '#666', display: 'flex', cursor: 'pointer' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: '50%', backgroundColor: NAVY, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
  },
  courseCard: {
    backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '2rem', display: 'flex', gap: '1.2rem', alignItems: 'flex-start',
  },
  courseIcon: {
    width: 52, height: 52, borderRadius: '12px', backgroundColor: 'rgba(30,42,120,0.1)',
    color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  courseTitle: { margin: 0, fontSize: '1.3rem', color: '#1a1a1a' },
  courseMeta: { fontSize: '0.85rem', color: '#888', margin: '0.3rem 0 0.8rem' },
  courseDescription: { fontSize: '0.9rem', color: '#555', lineHeight: 1.5, marginBottom: '1.2rem' },
  primaryButton: {
    padding: '0.65rem 1.2rem', backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', border: 'none', borderRadius: '9px', fontSize: '0.9rem', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
  },
  exerciseGrid: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
  exerciseCard: {
    backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7eaf5', padding: '1.1rem 1.3rem',
    display: 'flex', flexDirection: 'column', gap: '0.5rem', cursor: 'pointer',
  },
  exerciseTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  exerciseBadge: {
    fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', backgroundColor: '#f3ecff',
    padding: '0.25rem 0.6rem', borderRadius: '999px',
  },
  exerciseArrow: { color: '#999', display: 'flex' },
  exerciseTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a' },
  exerciseDescriptionText: { fontSize: '0.8rem', color: '#777', lineHeight: 1.4 },
  emptyText: { color: '#888', fontSize: '0.9rem' },
};

export default CourseDescription;