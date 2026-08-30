import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
const API_BASE_URL = 'https://lfass4s0ll.execute-api.us-east-1.amazonaws.com';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  BookIcon, CapIcon, BellIcon, HelpIcon,
  MenuIcon, SettingsIcon, UserIcon, MailIcon,
} from './Icons';
import {
  getCourseInfo, getCourseDetails, getInvitationsForCourse,
  sendInvitationByEmail, generateShareableLink,
  getExercisesForCourse,
} from './Mockenrollments';
import {
  getResourcesForCourse, addResource, deleteResource,
} from './Mockresources';


// NOTE (flagged deliberately): falls back to 'c1' only if no courseId was
// passed via navigation state -- e.g. someone lands here directly by URL
// during testing. The real entry point is Instructorprofile.jsx's
// handleSelectCourse(), which already passes { courseId, courseTitle }
// via location.state -- same pattern CourseDescription.jsx uses on the
// student side.
const FALLBACK_COURSE_ID = 'c1';

const inviteCSS = `
  .inviteInput::placeholder {
    color: #1a1a1a;
    opacity: 0.45;
  }
  .inviteInput:focus {
    border-color: ${NAVY};
    box-shadow: 0 0 0 3px rgba(30, 42, 120, 0.12);
  }
  .invitePillButton:hover {
    filter: brightness(1.05);
  }
  .invitePillButton:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .exerciseRow {
    transition: background 0.15s ease;
    cursor: default;
  }
  .exerciseRow:hover {
    background: #f5f7ff;
  }
  .viewBtn {
    transition: background 0.15s ease;
  }
  .viewBtn:hover {
    background: #eef2ff;
  }
`;


function InstructorCourseOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const COURSE_ID = location.state?.courseId || FALLBACK_COURSE_ID;

  const [view, setView] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const mockCourse = getCourseInfo(COURSE_ID);
  const course = mockCourse || { 
    id: COURSE_ID, 
    title: location.state?.courseTitle || 'Course Overview' 
  };
  
  const mockDetails = getCourseDetails(COURSE_ID);
  const details = mockDetails || {
    description: 'This is a live course from the database.',
    notions: ['Live Course'],
    rules: ['Follow the honor code'],
    tips: ['Keep your code clean']
  };

  const [invitations, setInvitations] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');
  const [shareableLink, setShareableLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const [exercises, setExercises] = useState([]);

  // Popup state
  const [viewingExercise, setViewingExercise] = useState(null);
  const [buttonRect, setButtonRect] = useState(null);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, placement: 'above', arrowOffset: 0 });
  const popupRef = useRef(null);

  // Restore view from navigation state
  useEffect(() => {
    if (location.state?.initialView) {
      setView(location.state.initialView);
    }
  }, [location.state]);

  // Load exercises from real API
  useEffect(() => {
    async function loadExercises() {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const res = await fetch(`${API_BASE_URL}/assignments?courseId=${COURSE_ID}`, {
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
          createdAt: item.CreatedAt,
        }));
        setExercises(mapped);
      } catch (err) {
        console.warn('Could not load exercises:', err);
      }
    }
    if (COURSE_ID) loadExercises();
  }, [COURSE_ID]);

  // Load enrollments (invitations) from real API
  useEffect(() => {
    async function loadEnrollments() {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const res = await fetch(`${API_BASE_URL}/enrollments?courseId=${COURSE_ID}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) return;
        const data = await res.json();
        const enrollments = data.enrollments || [];
        const mapped = enrollments.map((item) => ({
          id: item.StudentID,
          email: item.StudentEmail || item.StudentName || item.StudentID,
          status: (item.Status || 'pending').toLowerCase(),
          createdAt: item.CreatedAt || new Date().toISOString(),
        }));
        setInvitations(mapped);
      } catch (err) {
        console.warn('Could not load enrollments:', err);
      }
    }
    if (COURSE_ID) loadEnrollments();
  }, [COURSE_ID]);

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

  // Click outside to close popup
  useEffect(() => {
    function handleClickOutside(event) {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setViewingExercise(null);
        setButtonRect(null);
      }
    }
    if (viewingExercise) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [viewingExercise]);

  // Recalculate popup position
  useEffect(() => {
    if (!viewingExercise || !buttonRect) return;

    const updatePosition = () => {
      const popup = popupRef.current;
      if (!popup) return;
      const popupWidth = popup.offsetWidth;
      const popupHeight = popup.offsetHeight;
      const gap = 12;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Vertical placement
      const spaceAbove = buttonRect.top - gap;
      const spaceBelow = viewportHeight - buttonRect.bottom - gap;
      let top, placement;
      if (spaceAbove >= popupHeight) {
        top = buttonRect.top - popupHeight - gap;
        placement = 'above';
      } else if (spaceBelow >= popupHeight) {
        top = buttonRect.bottom + gap;
        placement = 'below';
      } else {
        top = (viewportHeight - popupHeight) / 2;
        placement = 'center';
      }

      // Horizontal: try to center, but keep within viewport
      const centerX = buttonRect.left + buttonRect.width / 2;
      let left = centerX - popupWidth / 2;
      const minLeft = 10;
      const maxLeft = viewportWidth - popupWidth - 10;
      if (left < minLeft) left = minLeft;
      if (left > maxLeft) left = maxLeft;

      // Arrow offset: distance from popup's left edge to the button's center
      const arrowOffset = centerX - left;

      setPopupPosition({ top, left, placement, arrowOffset });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [viewingExercise, buttonRect]);

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
    { label: 'Overview', icon: <BookIcon />, active: view === 'overview', disabled: false, onClick: () => { setView('overview'); closeSidebar(); } },
    { label: 'Students', icon: <UserIcon />, active: view === 'students', disabled: false, onClick: () => { setView('students'); closeSidebar(); } },
    { label: 'Exercises', icon: <CapIcon />, active: view === 'exercises', disabled: false, onClick: () => { setView('exercises'); closeSidebar(); } },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: false, onClick: () => navigate('/help') },];

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSendEmailInvite = async (e) => {
    e.preventDefault();
    setEmailError('');
    setConfirmationMessage('');

    const trimmed = emailInput.trim();
    if (!trimmed) {
      setEmailError('Please enter a student email.');
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setSendingEmail(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const res = await fetch(`${API_BASE_URL}/enrollments/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ courseId: COURSE_ID, email: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 404) {
          setEmailError('No student found with this email.');
        } else if (res.status === 409) {
          setEmailError(data.message || 'This student is already invited or enrolled.');
        } else {
          setEmailError(data.message || 'Failed to send invitation.');
        }
        return;
      }

      setConfirmationMessage(`Invitation sent to ${trimmed}`);
      setEmailInput('');
    } catch (err) {
      console.error('Invite error:', err);
      setEmailError('Network error. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleGenerateLink = () => {
    const invite = generateShareableLink(COURSE_ID);
    setInvitations(getInvitationsForCourse(COURSE_ID));
    const url = `${window.location.origin}/invite?token=${invite.token}`;
    setShareableLink(url);
    setLinkCopied(false);
  };

  const handleCopyLink = async () => {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  const handleCreateExercise = () => {
    navigate('/instructor/course/exercises/create', {
      state: { courseId: COURSE_ID, courseTitle: course?.title || 'Course' },
    });
  };

  const handleViewExercise = (exercise, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setButtonRect(rect);
    setViewingExercise(exercise);
  };

  const closePopup = () => {
    setViewingExercise(null);
    setButtonRect(null);
  };

  if (!course) {
    return (
      <div style={styles.page}>
        <main style={styles.main}>
          <p style={{ color: '#888' }}>Course not found.</p>
        </main>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <style>{inviteCSS}</style>

      <Sidebar
        subtitle={course.title}
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
            <h1 style={styles.pageTitle}>{course.title}</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton} onClick={() => navigate('/settings')}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate('/profile/instructor')}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        {/* OVERVIEW */}
        {view === 'overview' && details && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Course Description</h2>
              <p style={styles.descriptionText}>{details.description}</p>
            </section>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Notions to Acquire</h2>
              <ul style={styles.list}>
                {details.notions.map((item, idx) => (
                  <li key={idx} style={styles.listItem}>{item}</li>
                ))}
              </ul>
            </section>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>General Rules</h2>
              <ul style={styles.list}>
                {details.rules.map((item, idx) => (
                  <li key={idx} style={styles.listItem}>{item}</li>
                ))}
              </ul>
            </section>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Tips to Succeed</h2>
              <ul style={styles.list}>
                {details.tips.map((item, idx) => (
                  <li key={idx} style={styles.listItem}>{item}</li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {/* STUDENTS */}
        {view === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Invite Students</h2>
              <p style={styles.cardSubtitle}>
                Invite students to <strong>{course.title}</strong> by email, or share a link they can use to join.
              </p>
              <div style={styles.inviteRowsWrap}>
                <div style={styles.inviteRow}>
                  <span style={styles.inviteRowLabel}>Shareable link</span>
                  <div style={styles.inviteRowControl}>
                    <input
                      type="text"
                      readOnly
                      value={shareableLink || 'Click Generate to create a link'}
                      style={styles.pillInputReadOnly}
                    />
                    {shareableLink ? (
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="invitePillButton"
                        style={styles.pillButtonSecondary}
                      >
                        {linkCopied ? 'Copied!' : 'Copy'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGenerateLink}
                        className="invitePillButton"
                        style={styles.pillButtonPrimary}
                      >
                        Generate
                      </button>
                    )}
                  </div>
                </div>
                <form onSubmit={handleSendEmailInvite} style={styles.inviteRow}>
                  <span style={styles.inviteRowLabel}>Invite by email</span>
                  <div style={styles.inviteRowControl}>
                    <input
                      type="email"
                      className="inviteInput"
                      value={emailInput}
                      onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                      placeholder="student@example.com"
                      style={styles.pillInput}
                    />
                    <button
                      type="submit"
                      disabled={sendingEmail}
                      className="invitePillButton"
                      style={styles.pillButtonPrimary}
                    >
                      {sendingEmail ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                </form>
              </div>
              {emailError && <p style={styles.errorText}>{emailError}</p>}
              {confirmationMessage && <p style={styles.successText}>{confirmationMessage}</p>}
            </section>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Invitations</h2>
              {invitations.length === 0 ? (
                <p style={styles.emptyText}>No invitations sent yet for this course.</p>
              ) : (
                <div style={styles.table}>
                  <div style={styles.tableHeaderRow}>
                    <span style={{ ...styles.tableCell, flex: 2 }}>Student</span>
                    <span style={{ ...styles.tableCell, flex: 1 }}>Status</span>
                    <span style={{ ...styles.tableCell, flex: 1.2 }}>Sent</span>
                  </div>
                  {invitations.map((inv) => (
                    <div key={inv.id} style={styles.tableRow}>
                      <span style={{ ...styles.tableCell, flex: 2 }}>
                        {inv.email ? inv.email : <span style={{ color: '#999', fontStyle: 'italic' }}>Awaiting student access</span>}
                      </span>
                      <span style={{ ...styles.tableCell, flex: 1 }}>
                        <span style={inv.status === 'accepted' ? styles.badgeAccepted : (inv.status === 'declined' ? styles.badgeDeclined : styles.badgePending)}>
                          {inv.status}
                        </span>
                      </span>
                      <span style={{ ...styles.tableCell, flex: 1.2, color: '#888', fontSize: '0.8rem' }}>
                        {new Date(inv.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* EXERCISES */}
        {view === 'exercises' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <section style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={styles.cardTitle}>Exercises</h2>
                <button type="button" onClick={handleCreateExercise} style={styles.createExerciseButton}>
                  + Create Exercise
                </button>
              </div>
              <p style={styles.cardSubtitle}>
                Manage exercises for <strong>{course.title}</strong>. Exercises will be visible to students after they enroll.
              </p>
              {exercises.length === 0 ? (
                <p style={styles.emptyText}>No exercises created yet. Click "Create Exercise" to add one.</p>
              ) : (
                <div style={styles.exerciseTable}>
                  <div style={styles.exerciseTableHeader}>
                    <span style={{ flex: 2 }}>Title</span>
                    <span style={{ flex: 1 }}>Badge</span>
                    <span style={{ flex: 0.8 }}>Max Attempts</span>
                    <span style={{ flex: 0.6 }}>Actions</span>
                  </div>
                  {exercises.map((ex) => (
                    <div key={ex.id} className="exerciseRow" style={styles.exerciseRow}>
                      <span style={{ flex: 2, fontWeight: 600 }}>{ex.title}</span>
                      <span style={{ flex: 1 }}>
                        <span style={styles.exerciseBadge}>{ex.badge || 'General'}</span>
                      </span>
                      <span style={{ flex: 0.8 }}>{ex.maxAttempts}</span>
                      <span style={{ flex: 0.6 }}>
                        <button
                          type="button"
                          className="viewBtn"
                          onClick={(e) => handleViewExercise(ex, e)}
                          style={styles.viewExerciseButton}
                        >
                          View
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* POPUP */}
      {viewingExercise && buttonRect && (
        <div
          ref={popupRef}
          style={{
            position: 'fixed',
            left: popupPosition.left,
            top: popupPosition.top,
            zIndex: 2000,
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(30,42,120,0.2)',
            border: `1px solid ${NAVY}`,
            padding: '1.2rem 1.5rem',
            maxWidth: '400px',
            width: 'max-content',
            textAlign: 'left',
            transition: 'opacity 0.15s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: popupPosition.arrowOffset,
              transform: 'translateX(-50%)',
              top: popupPosition.placement === 'above' ? '100%' : 'auto',
              bottom: popupPosition.placement === 'below' ? '100%' : 'auto',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: popupPosition.placement === 'above' ? `8px solid ${NAVY}` : 'none',
              borderBottom: popupPosition.placement === 'below' ? `8px solid ${NAVY}` : 'none',
              marginTop: popupPosition.placement === 'above' ? '-1px' : 0,
              marginBottom: popupPosition.placement === 'below' ? '-1px' : 0,
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: NAVY }}>{viewingExercise.title}</h3>
            <button
              onClick={closePopup}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '1.2rem',
                cursor: 'pointer',
                color: '#888',
                padding: '0 0 0 0.8rem',
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#333' }}>
            <p><strong>Description:</strong> {viewingExercise.description}</p>
            <p><strong>Badge:</strong> {viewingExercise.badge || 'General'}</p>
            <p><strong>Max Attempts:</strong> {viewingExercise.maxAttempts}</p>
            <p><strong>Starter Code:</strong></p>
            <pre style={{
              background: '#f5f7fb',
              padding: '0.6rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: '120px',
              overflow: 'auto',
              border: '1px solid #e7eaf5',
            }}>
              {viewingExercise.starterCode || '(none provided)'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', background: '#f5f7fb', fontFamily: 'system-ui, -apple-system, sans-serif' },
  main: { flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  hamburgerButton: { background: 'none', border: 'none', color: NAVY, cursor: 'pointer', display: 'flex', padding: '0.2rem', borderRadius: '6px' },
  pageTitle: { color: '#1a1a1a', fontSize: '1.4rem', fontWeight: 800, margin: 0 },
  headerIcons: { display: 'flex', alignItems: 'center', gap: '1rem' },
  headerIconButton: { color: '#666', display: 'flex', cursor: 'pointer' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: '50%', backgroundColor: NAVY, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
    fontWeight: 700, cursor: 'pointer',
  },
  card: {
    backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem',
  },
  cardTitle: { margin: 0, fontSize: '1.1rem', color: '#1a1a1a' },
  cardSubtitle: { fontSize: '0.85rem', color: '#666', margin: '0.4rem 0 1.2rem', lineHeight: 1.4 },
  descriptionText: { fontSize: '0.9rem', color: '#444', lineHeight: 1.6, margin: '0.6rem 0 0' },
  list: { margin: '0.6rem 0 0', paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  listItem: { fontSize: '0.88rem', color: '#444', lineHeight: 1.5 },

  inviteRowsWrap: { display: 'flex', flexDirection: 'column', gap: '0.9rem', marginTop: '0.4rem' },
  inviteRow: {
    display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
    padding: '0.9rem 1.1rem', borderRadius: '14px', backgroundColor: '#f7f8fc', border: '1px solid #edeff6',
  },
  inviteRowLabel: {
    fontSize: '0.78rem', fontWeight: 700, color: '#555', textTransform: 'uppercase',
    letterSpacing: '0.03em', width: '130px', flexShrink: 0,
  },
  inviteRowControl: { display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: '260px' },
  pillInput: {
    flex: 1, height: '44px', padding: '0 1rem', borderRadius: '999px',
    border: '1px solid #d7dce8', fontSize: '0.88rem', color: '#1a1a1a',
    backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  },
  pillInputReadOnly: {
    flex: 1, height: '44px', padding: '0 1rem', borderRadius: '999px',
    border: '1px solid #e2e5ee', fontSize: '0.85rem', color: '#555',
    backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box',
  },
  pillButtonPrimary: {
    height: '44px', padding: '0 1.4rem', borderRadius: '999px', border: 'none',
    backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  pillButtonSecondary: {
    height: '44px', padding: '0 1.4rem', borderRadius: '999px', border: `1.5px solid ${NAVY}`,
    backgroundColor: '#fff', color: NAVY, fontSize: '0.85rem', fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  errorText: { color: '#c00', fontSize: '0.8rem', margin: '0.8rem 0 0' },
  successText: { color: '#0a7c2f', fontSize: '0.8rem', margin: '0.8rem 0 0' },
  emptyText: { color: '#888', fontSize: '0.85rem' },
  table: { display: 'flex', flexDirection: 'column' },
  tableHeaderRow: {
    display: 'flex', padding: '0.5rem 0.3rem', borderBottom: '1px solid #e7eaf5',
    fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.03em',
  },
  tableRow: {
    display: 'flex', padding: '0.7rem 0.3rem', borderBottom: '1px solid #f0f1f6', alignItems: 'center',
  },
  tableCell: { fontSize: '0.85rem', color: '#333' },
  badgePending: {
    fontSize: '0.7rem', fontWeight: 700, color: '#a16207', backgroundColor: '#fef3c7',
    padding: '0.2rem 0.6rem', borderRadius: '999px', textTransform: 'capitalize',
  },
  badgeAccepted: {
    fontSize: '0.7rem', fontWeight: 700, color: '#0a7c2f', backgroundColor: '#dcfce7',
    padding: '0.2rem 0.6rem', borderRadius: '999px', textTransform: 'capitalize',
  },
  badgeDeclined: {
    fontSize: '0.7rem', fontWeight: 700, color: '#991b1b', backgroundColor: '#fee2e2',
    padding: '0.2rem 0.6rem', borderRadius: '999px', textTransform: 'capitalize',
  },

  exerciseTable: { display: 'flex', flexDirection: 'column', marginTop: '0.5rem' },
  exerciseTableHeader: {
    display: 'flex', padding: '0.5rem 0.3rem', borderBottom: '1px solid #e7eaf5',
    fontSize: '0.72rem', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.03em',
  },
  exerciseRow: {
    display: 'flex', alignItems: 'center', padding: '0.7rem 0.3rem',
    borderBottom: '1px solid #f0f1f6', fontSize: '0.85rem', color: '#333',
  },
  exerciseBadge: {
    display: 'inline-block',
    fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed', backgroundColor: '#f3ecff',
    padding: '0.2rem 0.6rem', borderRadius: '999px',
  },
  createExerciseButton: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    padding: '0.5rem 1.2rem', borderRadius: '8px', border: `1px solid ${NAVY}`,
    backgroundColor: 'transparent', color: NAVY, fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    ':hover': { backgroundColor: 'rgba(30,42,120,0.05)' },
  },
  viewExerciseButton: {
    padding: '0.2rem 0.8rem', borderRadius: '6px', border: '1px solid #d7dce8',
    backgroundColor: '#fff', color: '#555', fontSize: '0.75rem', fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.15s',
    ':hover': { backgroundColor: '#f5f5f5' },
  },
};

export default InstructorCourseOverview;