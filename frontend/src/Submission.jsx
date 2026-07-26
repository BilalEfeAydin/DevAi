import { useLocation, useNavigate } from 'react-router-dom';
import { NAVY, NAVY_DARK } from './theme';
import { CapIcon } from './icons';

// Placeholder page -- the real upload/submit flow (file picker, submit
// button, "Pending" status) is built next. This exists so the Continue
// button on CoursePicker.jsx has a working destination today.
function Submission() {
  const navigate = useNavigate();
  const location = useLocation();
  const courseTitle = location.state?.courseTitle || null;

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <span style={styles.icon}><CapIcon /></span>
        <h2 style={styles.title}>Submission</h2>
        {courseTitle ? (
          <p style={styles.text}>
            Course selected: <strong>{courseTitle}</strong>. The upload screen is coming next.
          </p>
        ) : (
          <p style={styles.text}>This page is a placeholder -- the upload screen is coming next.</p>
        )}
        <button type="button" onClick={() => navigate('/courses')} style={styles.button}>
          Back to Courses
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#f5f7fb', fontFamily: 'system-ui, -apple-system, sans-serif', padding: '1.5rem',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '2rem', maxWidth: '420px', textAlign: 'center',
  },
  icon: { color: NAVY, display: 'flex', justifyContent: 'center', marginBottom: '0.8rem' },
  title: { color: '#1a1a1a', margin: 0, fontSize: '1.2rem' },
  text: { color: '#666', fontSize: '0.9rem', margin: '0.6rem 0 1.4rem', lineHeight: 1.4 },
  button: {
    padding: '0.6rem 1.2rem', backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', border: 'none', borderRadius: '9px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
};

export default Submission;