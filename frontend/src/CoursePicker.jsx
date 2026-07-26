import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAVY, NAVY_DARK } from './theme';
import { BookIcon, ArrowIcon, CapIcon } from './icons';

// NOTE (flagged deliberately): these courses are hardcoded placeholders.
// There is no Courses table / API yet (student -> course enrollment is
// planned to come from an instructor invite link, not built). Replace
// this array with a real fetch (e.g. GET /courses for the logged-in
// student) once that backend piece exists. Nothing else in this file
// needs to change -- the render logic already maps over `courses`.
const courses = [
  { id: 'c1', title: 'Introduction to Python', instructor: 'Prof. Amrani', color: '#1e2a78' },
  { id: 'c2', title: 'Data Structures & Algorithms', instructor: 'Prof. Bensalah', color: '#7c3aed' },
  { id: 'c3', title: 'Web Development Basics', instructor: 'Prof. Khelifi', color: '#0e9f6e' },
];

const hoverCSS = `
  .courseCard {
    transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
    cursor: pointer;
  }
  .courseCard:hover {
    box-shadow: 0 8px 20px rgba(30, 42, 120, 0.14);
    transform: translateY(-2px);
  }
`;

function CoursePicker() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);

  const selectedCourse = courses.find((c) => c.id === selectedId) || null;

 const handleContinue = () => {
  if (!selectedCourse) return;
  // CourseDescription.jsx reads this via useLocation().state -- see that file.
  navigate('/course-description', {
    state: { courseId: selectedCourse.id, courseTitle: selectedCourse.title },
  });
};

  return (
    <div style={styles.page}>
      <style>{hoverCSS}</style>

      <header style={styles.topbar}>
        <button type="button" onClick={() => navigate('/profile/student')} style={styles.backButton}>
          <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><ArrowIcon /></span>
          Back to Profile
        </button>
        <div style={styles.brandRow}>
          <span style={styles.capIcon}><CapIcon /></span>
          <span style={styles.brandText}>DevAI</span>
        </div>
      </header>

      <main style={styles.main}>
        <h1 style={styles.title}>Choose a Course</h1>
        <p style={styles.subtitle}>
          Select the course you want to submit code for. Don't see your course?
          Ask your instructor for an invite link.
        </p>

        <div style={styles.grid}>
          {courses.map((course) => {
            const isSelected = course.id === selectedId;
            return (
              <div
                key={course.id}
                className="courseCard"
                onClick={() => setSelectedId(course.id)}
                style={{
                  ...styles.courseCard,
                  borderColor: isSelected ? NAVY : '#e7eaf5',
                  backgroundColor: isSelected ? '#f5f7ff' : '#fff',
                }}
              >
                <span style={{ ...styles.courseIcon, backgroundColor: course.color + '1a', color: course.color }}>
                  <BookIcon />
                </span>
                <div style={styles.courseText}>
                  <div style={styles.courseTitle}>{course.title}</div>
                  <div style={styles.courseInstructor}>{course.instructor}</div>
                </div>
                <span style={isSelected ? styles.radioSelected : styles.radio} />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selectedCourse}
          style={selectedCourse ? styles.continueButton : styles.continueButtonDisabled}
        >
          Continue <ArrowIcon />
        </button>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  topbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    backgroundColor: '#fff',
    borderBottom: '1px solid #e7eaf5',
  },
  backButton: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none',
    border: 'none', color: '#555', fontSize: '0.85rem', cursor: 'pointer', padding: 0,
  },
  brandRow: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  capIcon: { color: NAVY, display: 'flex' },
  brandText: { color: NAVY, fontWeight: 800, fontSize: '1.1rem' },
  main: { maxWidth: '640px', margin: '0 auto', padding: '2.5rem 1.5rem' },
  title: { color: '#1a1a1a', fontSize: '1.6rem', fontWeight: 800, margin: 0 },
  subtitle: { color: '#666', fontSize: '0.9rem', marginTop: '0.5rem', marginBottom: '1.8rem', lineHeight: 1.4 },
  grid: { display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '2rem' },
  courseCard: {
    display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.2rem',
    borderRadius: '12px', border: '1px solid #e7eaf5', backgroundColor: '#fff',
  },
  courseIcon: {
    width: 42, height: 42, borderRadius: '10px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  courseText: { flex: 1, textAlign: 'left' },
  courseTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a' },
  courseInstructor: { fontSize: '0.8rem', color: '#777', marginTop: '0.15rem' },
  radio: {
    width: 18, height: 18, borderRadius: '50%', border: '2px solid #d7dce8', flexShrink: 0,
  },
  radioSelected: {
    width: 18, height: 18, borderRadius: '50%', border: `5px solid ${NAVY}`, flexShrink: 0,
  },
  continueButton: {
    width: '100%', padding: '0.8rem', backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
  },
  continueButtonDisabled: {
    width: '100%', padding: '0.8rem', backgroundColor: '#d7dce8',
    color: '#fff', border: 'none', borderRadius: '10px', fontSize: '0.95rem', fontWeight: 600,
    cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
  },
};

export default CoursePicker;