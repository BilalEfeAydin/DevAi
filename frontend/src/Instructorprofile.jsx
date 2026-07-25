import { styles } from './Theme';

// Placeholder page — replace with the real instructor dashboard once
// that feature is built. This exists so /profile/instructor has
// somewhere to render after a successful login.
function InstructorProfile() {
  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.card}>
          <h2 style={{ color: '#1e2a78', margin: 0 }}>Instructor Profile</h2>
          <p style={{ color: '#555', marginTop: '0.6rem' }}>
            You're logged in as an instructor. This page is a placeholder — the real dashboard is coming up next.
          </p>
        </div>
      </div>
    </div>
  );
}

export default InstructorProfile;