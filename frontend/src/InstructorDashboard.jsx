// InstructorDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL } from './amplifyConfig';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  UserIcon, BookIcon, ChartIcon, BellIcon,
  HelpIcon, MenuIcon, SettingsIcon, ArrowIcon,
} from './Icons';

// Accent palette reused from RegisterCourse.jsx's COLORS constant, so the
// dashboard feels consistent with the rest of the instructor-facing UI
// instead of introducing a fourth color system.
const ACCENTS = {
  courses: '#1e2a78',   // NAVY
  students: '#7c3aed',  // naming/purple
  trendUp: '#0e9f6e',   // structure/green
  trendDown: '#ef4444', // forbidden/red
  attention: '#f59e0b', // complexity/amber
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function InstructorDashboard() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [courses, setCourses] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const instructorId = session.tokens?.idToken?.payload?.sub;

        if (!instructorId) {
          setError('Could not identify your instructor account. Please log in again.');
          setLoading(false);
          return;
        }

        const coursesRes = await fetch(
          `${API_BASE_URL}/courses?instructorId=${instructorId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (!coursesRes.ok) throw new Error('Could not load your courses.');
        const courseItems = await coursesRes.json();

        const mappedCourses = (courseItems || []).map((c) => ({
          id: c.CourseID,
          title: c.Title || c.CourseID,
          color: c.Color || NAVY,
          studentCount: Array.isArray(c.EnrolledStudents) ? c.EnrolledStudents.length : 0,
        }));
        setCourses(mappedCourses);

        // NOTE (flagged deliberately): there is no aggregate "all submissions
        // for this instructor" endpoint yet -- only GET /submissions?courseId=.
        // So we fan out one request per course and merge client-side. Fine at
        // current course counts (a handful per instructor); revisit with a
        // real aggregate endpoint if that stops being true.
        const perCourseSubmissions = await Promise.all(
          mappedCourses.map(async (course) => {
            try {
              const res = await fetch(
                `${API_BASE_URL}/submissions?courseId=${course.id}`,
                { headers: token ? { Authorization: `Bearer ${token}` } : {} }
              );
              if (!res.ok) return [];
              const items = await res.json();
              return (items || []).map((s) => ({
                ...s,
                courseTitle: course.title,
                courseColor: course.color,
              }));
            } catch (err) {
              console.warn(`Could not load submissions for course ${course.id}:`, err);
              return [];
            }
          })
        );
        setSubmissions(perCourseSubmissions.flat());
      } catch (err) {
        console.warn('Could not load dashboard:', err);
        setError('Could not load your dashboard right now. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
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
    { label: 'Dashboard', icon: <ChartIcon />, active: true, disabled: false, onClick: undefined },
    { label: 'Profile', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate('/profile/instructor') },
{ label: 'Help', icon: <HelpIcon />, active: false, disabled: false, onClick: () => navigate('/help') },  ];

  // ---- Derived stats (all computed client-side from data already fetched) ----
  const totalCourses = courses.length;
  const totalStudents = courses.reduce((sum, c) => sum + c.studentCount, 0);

  const needsAttention = submissions
    .filter((s) => s.aiReview && (s.aiReview.status === 'VIOLATION' || s.aiReview.status === 'NEEDS_REVIEW'))
    .sort((a, b) => (b.CreatedAt || '').localeCompare(a.CreatedAt || ''))
    .slice(0, 5);

  const now = Date.now();
  const thisWeekCount = submissions.filter(
    (s) => s.CreatedAt && now - new Date(s.CreatedAt).getTime() <= SEVEN_DAYS_MS
  ).length;
  const lastWeekCount = submissions.filter((s) => {
    if (!s.CreatedAt) return false;
    const age = now - new Date(s.CreatedAt).getTime();
    return age > SEVEN_DAYS_MS && age <= SEVEN_DAYS_MS * 2;
  }).length;
  const trendPercent = lastWeekCount === 0
    ? (thisWeekCount > 0 ? 100 : 0)
    : Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100);
  const trendIsUp = trendPercent >= 0;

  return (
    <div style={styles.page}>
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
            <h1 style={styles.pageTitle}>Dashboard</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton} onClick={() => navigate('/settings')}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate('/profile/instructor')}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        {error && (
          <div style={styles.errorBanner}>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div style={styles.loadingWrap}>
            <div style={styles.loadingCardsRow}>
              <div style={styles.skeletonCard} />
              <div style={styles.skeletonCard} />
              <div style={styles.skeletonCard} />
            </div>
            <div style={styles.skeletonBlock} />
          </div>
        ) : (
          <>
            {/* ---- Stat cards ---- */}
            <div style={styles.statsRow}>
              <div style={{ ...styles.statCard, borderTop: `4px solid ${ACCENTS.courses}` }}>
                <div style={styles.statLabel}>TOTAL COURSES</div>
                <div style={styles.statValue}>{totalCourses}</div>
                <div style={styles.statSub}>
                  <span style={{ ...styles.statIconWrap, backgroundColor: `${ACCENTS.courses}1a`, color: ACCENTS.courses }}>
                    <BookIcon />
                  </span>
                  <span style={styles.statSubText}>Courses you manage</span>
                </div>
              </div>

              <div style={{ ...styles.statCard, borderTop: `4px solid ${ACCENTS.students}` }}>
                <div style={styles.statLabel}>TOTAL STUDENTS</div>
                <div style={styles.statValue}>{totalStudents}</div>
                <div style={styles.statSub}>
                  <span style={{ ...styles.statIconWrap, backgroundColor: `${ACCENTS.students}1a`, color: ACCENTS.students }}>
                    <UserIcon />
                  </span>
                  <span style={styles.statSubText}>Enrolled across all courses</span>
                </div>
              </div>

              <div style={{ ...styles.statCard, borderTop: `4px solid ${trendIsUp ? ACCENTS.trendUp : ACCENTS.trendDown}` }}>
                <div style={styles.statLabel}>WEEKLY ACTIVITY</div>
                <div style={styles.statValue}>{thisWeekCount}</div>
                <div style={styles.statSub}>
                  <span style={{
                    ...styles.statIconWrap,
                    backgroundColor: trendIsUp ? `${ACCENTS.trendUp}1a` : `${ACCENTS.trendDown}1a`,
                    color: trendIsUp ? ACCENTS.trendUp : ACCENTS.trendDown,
                  }}>
                    <span style={{ display: 'flex', transform: trendIsUp ? 'rotate(-90deg)' : 'rotate(90deg)' }}>
                      <ArrowIcon />
                    </span>
                  </span>
                  <span style={styles.statSubText}>
                    {trendIsUp ? '+' : ''}{trendPercent}% vs. last week
                  </span>
                </div>
              </div>
            </div>

            {/* ---- Needs Attention + Courses ---- */}
            <div style={styles.contentGrid}>
              <section style={styles.card}>
                <div style={styles.cardHeaderRow}>
                  <h2 style={styles.cardTitle}>Needs Attention</h2>
                  <span style={styles.countBadge}>{needsAttention.length}</span>
                </div>
                <p style={styles.cardSubtitle}>
                  Recent submissions flagged for review or a possible honor code concern.
                </p>

                {needsAttention.length === 0 ? (
                  <p style={styles.emptyText}>Nothing needs attention right now. 🎉</p>
                ) : (
                  <div style={styles.attentionList}>
                    {needsAttention.map((s) => {
                      const isViolation = s.aiReview.status === 'VIOLATION';
                      return (
                        <div
                          key={s.SubmissionID}
                          style={{
                            ...styles.attentionItem,
                            borderLeft: `3px solid ${isViolation ? '#f43f5e' : '#fbbf24'}`,
                          }}
                        >
                          <div style={styles.attentionTopRow}>
                            <span style={{
                              ...styles.attentionBadge,
                              color: isViolation ? '#c0392b' : '#a15c00',
                              backgroundColor: isViolation ? '#fee2e2' : '#fff2df',
                            }}>
                              {isViolation ? 'Violation' : 'Needs Review'}
                            </span>
                            <span style={styles.attentionCourse}>{s.courseTitle}</span>
                          </div>
                          <p style={styles.attentionSummary}>{s.aiReview.summary}</p>
                          {s.CreatedAt && (
                            <span style={styles.attentionDate}>
                              {new Date(s.CreatedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              <section style={styles.card}>
                <div style={styles.cardHeaderRow}>
                  <h2 style={styles.cardTitle}>Your Courses</h2>
                </div>

                {courses.length === 0 ? (
                  <p style={styles.emptyText}>
                    No courses yet.{' '}
                    <button type="button" onClick={() => navigate('/register-course')} style={styles.inlineLink}>
                      Register one
                    </button>
                  </p>
                ) : (
                  <div style={styles.courseListCompact}>
                    {courses.map((course) => (
                      <div
                        key={course.id}
                        className="dashCourseRow"
                        style={styles.courseRowCompact}
                        onClick={() => navigate('/instructor/course-dashboard', {
                          state: { courseId: course.id, courseTitle: course.title },
                        })}
                      >
                        <span style={{
                          ...styles.courseDot,
                          backgroundColor: course.color,
                        }} />
                        <span style={styles.courseRowTitle}>{course.title}</span>
                        <span style={styles.courseRowCount}>
                          {course.studentCount} student{course.studentCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
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
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
    fontWeight: 700, cursor: 'pointer',
  },

  errorBanner: {
    backgroundColor: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b',
    borderRadius: '10px', padding: '0.8rem 1rem', fontSize: '0.85rem', marginBottom: '1.2rem',
  },

  loadingWrap: { display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  loadingCardsRow: { display: 'flex', gap: '1rem' },
  skeletonCard: {
    flex: 1, height: '108px', borderRadius: '14px', backgroundColor: '#e9ecf6',
    animation: 'none',
  },
  skeletonBlock: { height: '260px', borderRadius: '14px', backgroundColor: '#e9ecf6' },

  statsRow: { display: 'flex', gap: '1rem', marginBottom: '1.4rem', flexWrap: 'wrap' },
  statCard: {
    flex: '1 1 220px', backgroundColor: '#fff', borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(30,42,120,0.08)', padding: '1.2rem 1.3rem',
  },
  statLabel: { fontSize: '0.7rem', fontWeight: 700, color: '#8b90a8', letterSpacing: '0.04em' },
  statValue: { fontSize: '2rem', fontWeight: 800, color: '#1a1a1a', margin: '0.3rem 0 0.7rem' },
  statSub: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  statIconWrap: {
    width: 28, height: 28, borderRadius: '8px', display: 'flex',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  statSubText: { fontSize: '0.78rem', color: '#777' },

  contentGrid: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1.2rem' },

  card: {
    backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.4rem',
  },
  cardHeaderRow: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  cardTitle: { margin: 0, fontSize: '1.05rem', color: '#1a1a1a' },
  cardSubtitle: { fontSize: '0.8rem', color: '#777', margin: '0.35rem 0 1rem', lineHeight: 1.4 },
  countBadge: {
    fontSize: '0.72rem', fontWeight: 700, color: ACCENTS.attention, backgroundColor: `${ACCENTS.attention}1a`,
    padding: '0.15rem 0.55rem', borderRadius: '999px',
  },
  emptyText: { color: '#888', fontSize: '0.88rem' },
  inlineLink: { background: 'none', border: 'none', color: NAVY, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.88rem' },

  attentionList: { display: 'flex', flexDirection: 'column', gap: '0.7rem' },
  attentionItem: { backgroundColor: '#fafbff', borderRadius: '8px', padding: '0.7rem 0.9rem' },
  attentionTopRow: { display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' },
  attentionBadge: { fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px' },
  attentionCourse: { fontSize: '0.78rem', color: '#888', fontWeight: 600 },
  attentionSummary: { fontSize: '0.85rem', color: '#333', margin: '0.2rem 0', lineHeight: 1.4 },
  attentionDate: { fontSize: '0.72rem', color: '#aaa' },

  courseListCompact: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  courseRowCompact: {
    display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.65rem 0.5rem',
    borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s ease',
  },
  courseDot: { width: 10, height: 10, borderRadius: '50%', flexShrink: 0 },
  courseRowTitle: { flex: 1, fontSize: '0.88rem', fontWeight: 600, color: '#1a1a1a' },
  courseRowCount: { fontSize: '0.75rem', color: '#888' },
};

export default InstructorDashboard;