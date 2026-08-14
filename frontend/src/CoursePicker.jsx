// CoursePicker.jsx

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NAVY, NAVY_DARK } from './Theme';
import { BookIcon, ArrowIcon, CapIcon } from './Icons';

// NOTE (flagged deliberately): status field ('accepted' | 'pending') is
// hardcoded here. It should come from the Enrollment table (User <-> Course,
// GSI on StudentID) once that API exists . Real data will carry the same shape: { id, title,
// instructor, color, status }.
const courses = [
  { id: 'c1', title: 'Introduction to Python', instructor: 'Prof. Amrani', color: '#1e2a78', status: 'accepted' },
  { id: 'c2', title: 'Data Structures & Algorithms', instructor: 'Prof. Bensalah', color: '#7c3aed', status: 'accepted' },
  { id: 'c3', title: 'Web Development Basics', instructor: 'Prof. Khelifi', color: '#0e9f6e', status: 'pending' },
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
  .courseCard.pending:hover {
    box-shadow: none;
    transform: none;
  }
`;

function CoursePicker() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);

  const selectedCourse = courses.find((c) => c.id === selectedId) || null;

  const handleCardClick = (course) => {
    if (course.status === 'pending') return; // not accepted yet -- can't select
    setSelectedId(course.id);
  };

  const handleContinue = () => {
    if (!selectedCourse) return;
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
            const isPending = course.status === 'pending';
            return (
              <div
                key={course.id}
                className={`courseCard${isPending ? ' pending' : ''}`}
                onClick={() => handleCardClick(course)}
                style={{
                  ...styles.courseCard,
                  borderColor: isSelected ? NAVY : '#e7eaf5',
                  backgroundColor: isPending ? '#f7f7f9' : (isSelected ? '#f5f7ff' : '#fff'),
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  opacity: isPending ? 0.65 : 1,
                }}
              >
                <span style={{ ...styles.courseIcon, backgroundColor: course.color + '1a', color: course.color }}>
                  <BookIcon />
                </span>
                <div style={styles.courseText}>
                  <div style={styles.courseTitle}>
                    {course.title}
                    {isPending && <span style={styles.pendingBadge}>Pending</span>}
                  </div>
                  <div style={styles.courseInstructor}>{course.instructor}</div>
                </div>
                {!isPending && (
                  <span style={isSelected ? styles.radioSelected : styles.radio} />
                )}
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
  courseTitle: { fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  courseInstructor: { fontSize: '0.8rem', color: '#777', marginTop: '0.15rem' },
  pendingBadge: {
    fontSize: '0.65rem', fontWeight: 700, color: '#a16207', backgroundColor: '#fef3c7',
    padding: '0.15rem 0.5rem', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.03em',
  },
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