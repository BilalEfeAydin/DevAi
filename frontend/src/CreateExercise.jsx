import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  BookIcon, CapIcon, BellIcon, HelpIcon,
  MenuIcon, SettingsIcon, UserIcon,
} from './Icons';
import { addExercise } from './Mockenrollments';

function CreateExercise() {
  const navigate = useNavigate();
  const location = useLocation();
  const { courseId, courseTitle } = location.state || {};

  const effectiveCourseId = courseId || 'c1';
  const effectiveCourseTitle = courseTitle || 'Course';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [badge, setBadge] = useState('');
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [starterCode, setStarterCode] = useState('# Write your solution here\n\n');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
    { label: 'Overview', icon: <BookIcon />, active: false, disabled: false, onClick: () => navigate(`/instructor/course-dashboard`, { state: { courseId: effectiveCourseId, courseTitle: effectiveCourseTitle } }) },
    { label: 'Students', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate(`/instructor/course-dashboard`, { state: { courseId: effectiveCourseId, courseTitle: effectiveCourseTitle } }) },
    { label: 'Exercises', icon: <CapIcon />, active: true, disabled: false, onClick: () => navigate(`/instructor/course-dashboard`, { state: { courseId: effectiveCourseId, courseTitle: effectiveCourseTitle } }) },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Exercise title is required.');
      return;
    }
    if (!description.trim()) {
      setError('Exercise description is required.');
      return;
    }
    if (maxAttempts < 1) {
      setError('Maximum attempts must be at least 1.');
      return;
    }

    try {
      const newExercise = addExercise(effectiveCourseId, {
        title: title.trim(),
        description: description.trim(),
        badge: badge.trim() || 'General',
        maxAttempts: Number(maxAttempts),
        starterCode: starterCode,
      });
      setSuccess(`Exercise "${newExercise.title}" created successfully!`);
      setTimeout(() => {
        navigate(`/instructor/course-dashboard`, {
          state: { courseId: effectiveCourseId, courseTitle: effectiveCourseTitle, initialView: 'exercises' },
        });
      }, 1200);
    } catch (err) {
      setError(err.message || 'Failed to create exercise.');
    }
  };

  const handleCancel = () => {
    navigate(`/instructor/course-dashboard`, {
      state: { courseId: effectiveCourseId, courseTitle: effectiveCourseTitle, initialView: 'exercises' },
    });
  };

  return (
    <div style={styles.page}>
      <Sidebar
        subtitle={effectiveCourseTitle}
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
            <h1 style={styles.pageTitle}>Create Exercise</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.card}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Exercise Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
                placeholder="e.g. Two Sum"
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...styles.input, ...styles.textarea }}
                placeholder="Describe the exercise and what students need to do."
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Badge / Category</label>
              <input
                type="text"
                value={badge}
                onChange={(e) => setBadge(e.target.value)}
                style={styles.input}
                placeholder="e.g. Python, Algorithm, HTML/CSS"
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Maximum Attempts</label>
              <input
                type="number"
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Math.max(1, Number(e.target.value) || 1))}
                style={{ ...styles.input, maxWidth: '120px' }}
                min={1}
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label}>Starter Code</label>
              <textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                style={{ ...styles.input, ...styles.codeEditor }}
                placeholder="Provide initial code for students to start with."
                rows={8}
              />
            </div>

            {error && <p style={styles.error}>{error}</p>}
            {success && <p style={styles.success}>{success}</p>}

            <div style={styles.buttonRow}>
              <button type="button" onClick={handleCancel} style={styles.cancelButton}>
                Cancel
              </button>
              <button type="submit" style={styles.submitButton}>
                Create Exercise
              </button>
            </div>
          </div>
        </form>
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
  },
  main: {
    flex: 1,
    padding: '1.5rem 2rem',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  hamburgerButton: {
    background: 'none',
    border: 'none',
    color: NAVY,
    cursor: 'pointer',
    display: 'flex',
    padding: '0.2rem',
    borderRadius: '6px',
  },
  pageTitle: {
    color: '#1a1a1a',
    fontSize: '1.5rem',
    fontWeight: 800,
    margin: 0,
  },
  headerIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIconButton: {
    color: '#666',
    display: 'flex',
    cursor: 'pointer',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: NAVY,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    flexShrink: 0,
    border: `2px solid ${NAVY}`,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem',
    borderTop: `4px solid ${NAVY}`,
  },
  fieldGroup: {
    marginBottom: '1.2rem',
    '&:last-child': { marginBottom: 0 },
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#333',
    marginBottom: '0.3rem',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #d7dce8',
    fontSize: '0.9rem',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    ':focus': {
      borderColor: NAVY,
      boxShadow: `0 0 0 3px rgba(30,42,120,0.12)`,
    },
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical',
  },
  codeEditor: {
    fontFamily: 'ui-monospace, Consolas, monospace',
    fontSize: '0.85rem',
    lineHeight: 1.5,
    minHeight: '120px',
    resize: 'vertical',
  },
  error: {
    color: '#c00',
    fontSize: '0.85rem',
    margin: '0.8rem 0 0',
  },
  success: {
    color: '#0a7c2f',
    fontSize: '0.85rem',
    margin: '0.8rem 0 0',
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1.2rem',
  },
  cancelButton: {
    padding: '0.7rem 2rem',
    background: 'transparent',
    border: '1px solid #d7dce8',
    borderRadius: '9px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#555',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  submitButton: {
    padding: '0.7rem 2rem',
    backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff',
    border: 'none',
    borderRadius: '9px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    ':hover': {
      opacity: 0.9,
    },
  },
};

export default CreateExercise;