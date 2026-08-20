import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import { NAVY } from './Theme';
import Sidebar from './Sidebar';
import {
  UserIcon, ChartIcon, BellIcon, HelpIcon,
  MenuIcon, SettingsIcon, ArrowIcon, PlusIcon,
} from './Icons';

// NOTE (flagged deliberately): mocked enrolled students, same placeholder
// pattern as CourseDescription.jsx's `exercisesByCourse`.
//  Replace with a
// real fetch ( GET /courses/:id/students) once the Enrollment API
// exists (Sprint 5 "Build Enrollment API").
//  Analytics columns (progress, avg attempts, status) are Sprint 6 scope 
const initialStudentsByCourse = {
  c1: [
    { id: 's1', name: 'Alex Johnson', email: 'alex.j@university.edu', status: 'accepted' },
    { id: 's2', name: 'Maria Belinsky', email: 'maria.b@university.edu', status: 'accepted' },
    { id: 's3', name: 'Sarah Kim', email: 's.kim@university.edu', status: 'invited' },
  ],
  c2: [
    { id: 's4', name: 'Chen Huang', email: 'c.huang@university.edu', status: 'accepted' },
  ],
};

const statusStyleMap = {
  accepted: { color: '#0a7c2f', backgroundColor: '#e6f6ea' },
  invited: { color: '#a15c00', backgroundColor: '#fff2df' },
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InstructorCourseDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const courseId = location.state?.courseId;
  const courseTitle = location.state?.courseTitle || 'Course';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState(initialStudentsByCourse[courseId] || []);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

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
    { label: 'Dashboard', icon: <ChartIcon />, active: false, disabled: false, onClick: () => navigate('/instructor/dashboard') },
    { label: 'Configuration', icon: <SettingsIcon />, active: false, disabled: true, onClick: undefined },
    { label: 'Profile', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate('/profile/instructor') },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];

  //  mock-only invite flow. 
  // Adds a locally-held student with status
  // "invited" -- no email is actually sent (Sprint 5 "Teacher UI: Send
  // invitation" backend not built yet).
  //  Real version will POST to the
  // Enrollment API and let DynamoDB drive `status`.
  const handleStartInvite = () => {
    setInviteError('');
    setInviteEmail('');
    setIsInviting(true);
  };

  const confirmInvite = () => {
    const trimmed = inviteEmail.trim();
    if (!trimmed) {
      setIsInviting(false);
      return;
    }
    if (!emailRegex.test(trimmed)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    if (students.some((s) => s.email.toLowerCase() === trimmed.toLowerCase())) {
      setInviteError('This student is already invited or enrolled.');
      return;
    }
    const newStudent = {
      id: `s-${Date.now()}`,
      name: trimmed.split('@')[0], // placeholder until real name comes back from the API
      email: trimmed,
      status: 'invited',
    };
    setStudents((prev) => [...prev, newStudent]);
    setIsInviting(false);
    setInviteEmail('');
    setInviteError('');
  };

  const cancelInvite = () => {
    setIsInviting(false);
    setInviteEmail('');
    setInviteError('');
  };

  const handleInviteKeyDown = (e) => {
    if (e.key === 'Enter') confirmInvite();
    if (e.key === 'Escape') cancelInvite();
  };

  return (
    <div style={styles.page}>
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
            <button type="button" onClick={() => navigate('/profile/instructor')} style={styles.backButton}>
              <span style={{ transform: 'rotate(180deg)', display: 'flex' }}><ArrowIcon /></span>
              Back to Profile
            </button>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton}><SettingsIcon /></span>
          </div>
        </header>

        <h1 style={styles.pageTitle}>{courseTitle}</h1>
        <p style={styles.subtitle}>{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>

        {/* placeholders only -- exercise/resource authoring is Sprint 6
            scope ("Ressource page ui"). 
            No form, no S3 wiring, nothing behind
            these yet.
             Kept disabled so the layout is final without faking
            a working flow. */}
        <div style={styles.courseActionsRow}>
          <button type="button" disabled style={styles.disabledActionButton} title="Coming soon — Sprint 6">
            + Add Exercise
          </button>
          <button type="button" disabled style={styles.disabledActionButton} title="Coming soon — Sprint 6">
            + Add Resource
          </button>
        </div>

        <div style={styles.tableCard}>
          <div style={styles.tableHeaderRow}>
            <span style={styles.tableHeaderCell}>Name</span>
            <span style={styles.tableHeaderCell}>Email</span>
            <span style={styles.tableHeaderCell}>Status</span>
          </div>

          {students.length === 0 ? (
            <p style={styles.emptyText}>No students enrolled in this course yet.</p>
          ) : (
            students.map((student) => (
              <div key={student.id} style={styles.tableRow}>
                <span style={styles.studentName}>{student.name}</span>
                <span style={styles.studentEmail}>{student.email}</span>
                <span style={{ ...styles.statusBadge, ...statusStyleMap[student.status] }}>
                  {student.status}
                </span>
              </div>
            ))
          )}

          <div style={styles.inviteRow}>
            {isInviting ? (
              <div style={styles.inviteInputWrap}>
                <input
                  type="email"
                  autoFocus
                  value={inviteEmail}
                  onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                  onKeyDown={handleInviteKeyDown}
                  onBlur={confirmInvite}
                  placeholder="student@university.edu"
                  style={styles.inviteInput}
                />
                {inviteError && <span style={styles.inviteError}>{inviteError}</span>}
              </div>
            ) : (
              <button type="button" onClick={handleStartInvite} style={styles.inviteButton}>
                <PlusIcon /> Invite Student
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', background: '#f5f7fb', fontFamily: 'system-ui, -apple-system, sans-serif' },
  main: { flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  hamburgerButton: { background: 'none', border: 'none', color: NAVY, cursor: 'pointer', display: 'flex', padding: '0.2rem', borderRadius: '6px' },
  backButton: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none',
    border: 'none', color: '#555', fontSize: '0.85rem', cursor: 'pointer', padding: 0,
  },
  headerIcons: { display: 'flex', alignItems: 'center', gap: '1rem' },
  headerIconButton: { color: '#666', display: 'flex', cursor: 'pointer' },
  pageTitle: { color: '#1a1a1a', fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.2rem' },
  subtitle: { color: '#777', fontSize: '0.85rem', marginBottom: '1rem' },
  courseActionsRow: { display: 'flex', gap: '0.7rem', marginBottom: '1.2rem' },
  disabledActionButton: {
    padding: '0.55rem 1rem', borderRadius: '8px', border: '1px dashed #d7dce8',
    backgroundColor: 'transparent', color: '#98a0b8', fontSize: '0.82rem', fontWeight: 600,
    cursor: 'not-allowed',
  },
  tableCard: {
    backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 16px rgba(30,42,120,0.06)',
    padding: '0.5rem 1.2rem',
  },
  tableHeaderRow: {
    display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.6fr', padding: '0.9rem 0.4rem',
    borderBottom: '1px solid #e7eaf5', textAlign: 'left',
  },
  tableHeaderCell: { fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.03em' },
  tableRow: {
    display: 'grid', gridTemplateColumns: '1fr 1.4fr 0.6fr', padding: '0.9rem 0.4rem',
    borderBottom: '1px solid #f0f1f6', alignItems: 'center', textAlign: 'left',
  },
  studentName: { fontSize: '0.9rem', fontWeight: 600, color: '#1a1a1a' },
  studentEmail: { fontSize: '0.85rem', color: '#666' },
  statusBadge: {
    justifySelf: 'start', fontSize: '0.7rem', fontWeight: 700, padding: '0.25rem 0.6rem',
    borderRadius: '999px', textTransform: 'capitalize',
  },
  emptyText: { padding: '1.2rem 0.4rem', color: '#888', fontSize: '0.9rem' },
  inviteRow: { padding: '0.9rem 0.4rem' },
  inviteButton: {
    display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.9rem',
    borderRadius: '8px', border: `1px solid ${NAVY}`, backgroundColor: 'transparent',
    color: NAVY, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer',
  },
  inviteInputWrap: { display: 'flex', flexDirection: 'column', gap: '0.3rem', maxWidth: '280px' },
  inviteInput: {
    padding: '0.5rem 0.7rem', borderRadius: '8px', border: `1px solid ${NAVY}`,
    fontSize: '0.85rem', outline: 'none',
  },
  inviteError: { fontSize: '0.75rem', color: '#c00' },
};

export default InstructorCourseDashboard;