import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { NAVY } from './Theme';
import Sidebar from './Sidebar';
import {
  UserIcon, BookIcon, CapIcon, BellIcon,
  HelpIcon, MailIcon, ChartIcon,
  MenuIcon, SettingsIcon
} from './Icons';

const hoverCSS = `
  .courseRow {
    transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
    cursor: pointer;
  }
  .courseRow:hover {
    box-shadow: 0 8px 20px rgba(30, 42, 120, 0.14);
    transform: translateY(-2px);
    border-color: ${NAVY};
  }
`;

// NOTE (flagged deliberately, same pattern as CoursePicker.jsx): these
// courses are hardcoded placeholders. There is no Courses table / API yet
// for instructor-created courses (Sprint 4 "Build Courses API" not done).
// Replace with a real fetch (e.g. GET /courses?instructorId=...) once that
// backend piece exists.
const mockCourses = [
  { id: 'c1', title: 'CS101 Intro to Python', studentCount: 142 },
  { id: 'c2', title: 'CS202 Data Structures', studentCount: 89 },
];

function InstructorProfile() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const attrs = await fetchUserAttributes();
        const name = attrs.name || '';
        const family = attrs.family_name || '';
        setFirstName(name);
        setLastName(family);
        setFullName([name, family].filter(Boolean).join(' ') || 'Instructor');
        setEmail(attrs.email || '');
      } catch (err) {
        console.warn('Could not load profile attributes:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login');
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last || '?';
  };

  // Dashboard = Sprint 6 analytics (aggregate across ALL of this
  // instructor's courses/exercises, e.g. "50% of students struggling on
  // Algorithms exercise 4"). Disabled until Sprint 6 -- do not reopen this
  // scope mid-Sprint-5 (team rule).
  //
  // NOTE: 'Configuration' was removed from this level -- rule/honor-code
  // configuration is per-exercise, not per-instructor-profile. It will
  // live inside a course's Exercises tab once that's built, not here.
  const navItems = [
    { label: 'Dashboard', icon: <ChartIcon />, active: false, disabled: true, onClick: undefined },
    { label: 'Profile', icon: <UserIcon />, active: true, disabled: false, onClick: undefined },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];
  const handleSelectCourse = (course) => {
    navigate('/instructor/course-dashboard', {
      state: { courseId: course.id, courseTitle: course.title },
    });
  };

  return (
    <div style={styles.page}>
      <style>{hoverCSS}</style>

      <Sidebar
        subtitle="Instructor Portal"
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
            <h1 style={styles.pageTitle}>My Profile</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            {/*  settings is a static icon for now, same as StudentProfile.jsx --
                no settings panel exists anywhere in the app yet. Wire up onClick
                here once that panel is built (separate task, not in this scope). */}
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        { /* Profile card with name, email, and initials avatar */ }
        <div style={styles.profileCard}>
          <span style={styles.profileAvatar}>
            {loadingProfile ? '...' : getInitials()}
          </span>
          <div style={styles.profileText}>
            <h2 style={styles.profileName}>
              {loadingProfile ? 'Loading...' : fullName}
            </h2>
            <p style={styles.profileMeta}>
              <MailIcon /> <span>{loadingProfile ? '' : email}</span>
            </p>
          </div>
        </div>

        <h3 style={styles.sectionTitle}>Courses Managed</h3>
        <div style={styles.coursesList}>
          {mockCourses.map((course) => (
            <div
              key={course.id}
              className="courseRow"
              style={styles.courseRow}
              onClick={() => handleSelectCourse(course)}
            >
              <span style={styles.courseIcon}><BookIcon /></span>
              <div style={styles.courseText}>
                <div style={styles.courseTitle}>{course.title}</div>
                <div style={styles.courseMeta}>{course.studentCount} students registered</div>
              </div>
              <span style={styles.courseArrow}>›</span>
            </div>
          ))}

          {/* course creation needs the Courses API (Sprint 4, not built yet).
              Disabled placeholder so the layout is final without faking a working flow. */}
          <button type="button" disabled style={styles.registerButton} title="Coming soon">
            + Register New Course
          </button>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f5f7fb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
  },
  main: { flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', marginLeft: 0 },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  hamburgerButton: {
    background: 'none', border: 'none', color: NAVY, cursor: 'pointer',
    display: 'flex', padding: '0.2rem', borderRadius: '6px', transition: 'background 0.2s',
  },
  pageTitle: { color: '#1a1a1a', fontSize: '1.5rem', fontWeight: 800, margin: 0 },
  headerIcons: { display: 'flex', alignItems: 'center', gap: '1rem' },
  headerIconButton: { color: '#666', display: 'flex', cursor: 'pointer' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: '50%', backgroundColor: NAVY, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
    fontWeight: 700, flexShrink: 0, border: `2px solid ${NAVY}`,
  },
  profileCard: {
    backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.5rem',
  },
  profileAvatar: {
    width: 64, height: 64, borderRadius: '50%', backgroundColor: NAVY, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem',
    fontWeight: 700, flexShrink: 0, border: `2px solid ${NAVY}`,
  },
  profileText: { display: 'flex', flexDirection: 'column', textAlign: 'left' },
  profileName: { margin: 0, fontSize: '1.2rem', color: '#1a1a1a', lineHeight: 1.3 },
  profileMeta: {
    margin: '0.25rem 0 0', fontSize: '0.85rem', color: '#666',
    display: 'flex', alignItems: 'center', gap: '0.35rem',
  },
  sectionTitle: { fontSize: '1rem', color: '#333', marginBottom: '0.8rem' },
  coursesList: { display: 'flex', flexDirection: 'column', gap: '0.8rem' },
  courseRow: {
    backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e7eaf5',
    padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1rem',
    boxShadow: '0 2px 8px rgba(30,42,120,0.04)',
  },
  courseIcon: {
    width: 42, height: 42, borderRadius: '10px', backgroundColor: 'rgba(30,42,120,0.1)',
    color: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  courseText: { flex: 1, textAlign: 'left' },
  courseTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a' },
  courseMeta: { fontSize: '0.8rem', color: '#777', marginTop: '0.15rem' },
  courseArrow: { fontSize: '1.4rem', color: '#999' },
  registerButton: {
    padding: '0.8rem', borderRadius: '12px', border: '1px dashed #d7dce8',
    backgroundColor: 'transparent', color: '#98a0b8', fontSize: '0.9rem', fontWeight: 600,
    cursor: 'not-allowed',
  },
};

export default InstructorProfile;