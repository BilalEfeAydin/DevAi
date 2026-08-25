import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import {
  BookIcon, CapIcon, BellIcon,
  HelpIcon, MenuIcon, SettingsIcon, ArrowIcon
} from './Icons';
import { getCourseDetails } from './Mockenrollments';
import { getResourcesForCourse } from './Mockresources';


const API_BASE_URL = 'https://lfass4s0ll.execute-api.us-east-1.amazonaws.com';

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
  const [view, setView] = useState('course');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [courseDetails, setCourseDetails] = useState(null);
  const [exercises, setExercises] = useState([]);

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

  useEffect(() => {
    if (courseId) {
      const details = getCourseDetails(courseId);
      setCourseDetails(details);
    }
  }, [courseId]);

  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last || '?';
  };

  // Load exercises from real API
  useEffect(() => {
    async function loadExercises() {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const res = await fetch(`${API_BASE_URL}/assignments?courseId=${courseId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const items = await res.json();
        const mapped = items.map((item) => ({
          id: item.AssignmentID,
          title: item.Title,
          description: item.Description || '',
          badge: item.Badge || 'General',
          maxAttempts: item.MaxAttempts || 5,
          starterCode: item.StarterCode || '',
        }));
        setExercises(mapped);
      } catch (err) {
        console.warn('Could not load exercises:', err);
      }
    }
    if (courseId) loadExercises();
  }, [courseId]);

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
      label: 'Course',
      icon: <BookIcon />,
      active: view === 'course',
      disabled: false,
      onClick: () => { setView('course'); closeSidebar(); },
    },
    {
      label: 'Exercises',
      icon: <CapIcon />,
      active: view === 'exercises',
      disabled: false,
      onClick: () => { setView('exercises'); closeSidebar(); },
    },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: false, onClick: () => navigate('/help') },
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
            <h1 style={styles.pageTitle}>
              {view === 'course' ? 'Course Details' : 'Exercises'}
            </h1>
          </div>
          <div style={styles.headerIcons}>
            <NotificationBell />
           <span style={styles.headerIconButton} onClick={() => navigate('/settings')}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate('/profile/student')}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        {view === 'course' && (
          <div style={styles.overviewContainer}>
            <div style={styles.courseHeader}>
              <h2 style={styles.courseTitle}>{courseTitle}</h2>
              <p style={styles.courseMeta}>Instructor: coming soon</p>
            </div>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Course Description</h3>
              <p style={styles.cardText}>
                {courseDetails?.description || 'No description available for this course.'}
              </p>
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Notions to Acquire</h3>
              {courseDetails?.notions?.length ? (
                <ul style={styles.list}>
                  {courseDetails.notions.map((item, idx) => (
                    <li key={idx} style={styles.listItem}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p style={styles.cardText}>No notions defined yet.</p>
              )}
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>General Rules</h3>
              {courseDetails?.rules?.length ? (
                <ul style={styles.list}>
                  {courseDetails.rules.map((item, idx) => (
                    <li key={idx} style={styles.listItem}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p style={styles.cardText}>No rules defined yet.</p>
              )}
            </section>

            <section style={styles.card}>
              <h3 style={styles.cardTitle}>Tips to Succeed</h3>
              {courseDetails?.tips?.length ? (
                <ul style={styles.list}>
                  {courseDetails.tips.map((item, idx) => (
                    <li key={idx} style={styles.listItem}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p style={styles.cardText}>No tips defined yet.</p>
              )}
            </section>
          </div>
        )}

        {view === 'exercises' && (
          <div style={styles.exerciseContainer}>
            <h2 style={styles.exerciseSectionTitle}>Exercises</h2>
            {exercises.length === 0 ? (
              <p style={styles.emptyText}>No exercises have been opened for this course yet.</p>
            ) : (
              <div style={styles.exerciseGrid}>
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

  overviewContainer: { display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  courseHeader: { marginBottom: '0.2rem' },
  courseTitle: { color: '#1a1a1a', fontSize: '1.4rem', fontWeight: 800, margin: 0 },
  courseMeta: { color: '#777', fontSize: '0.85rem', margin: '0.2rem 0 0' },

  card: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem',
  },
  cardTitle: { margin: 0, fontSize: '1.1rem', color: '#1a1a1a' },
  cardText: { fontSize: '0.9rem', color: '#444', lineHeight: 1.6, margin: '0.6rem 0 0' },
  list: { margin: '0.6rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  listItem: { fontSize: '0.88rem', color: '#444', lineHeight: 1.5 },

  exerciseContainer: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  exerciseSectionTitle: { fontSize: '1.2rem', fontWeight: 700, color: '#1a1a1a', margin: 0 },
  exerciseGrid: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e7eaf5',
    padding: '1.1rem 1.3rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    cursor: 'pointer',
  },
  exerciseTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  exerciseBadge: {
    fontSize: '0.7rem',
    fontWeight: 700,
    color: '#7c3aed',
    backgroundColor: '#f3ecff',
    padding: '0.25rem 0.6rem',
    borderRadius: '999px',
  },
  exerciseArrow: { color: '#999', display: 'flex' },
  exerciseTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a' },
  exerciseDescriptionText: { fontSize: '0.8rem', color: '#777', lineHeight: 1.4 },
  emptyText: { color: '#888', fontSize: '0.9rem' },
};

export default CourseDescription;