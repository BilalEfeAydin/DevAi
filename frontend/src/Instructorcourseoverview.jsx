import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  BookIcon, CapIcon, BellIcon, HelpIcon,
  MenuIcon, SettingsIcon, UserIcon, MailIcon,
} from './Icons';
import { getCourseInfo, getInvitationsForCourse, sendInvitationByEmail, generateShareableLink } from './Mockenrollments';

// NOTE (flagged deliberately): falls back to 'c1' only if no courseId was
// passed via navigation state -- e.g. someone lands here directly by URL
// during testing. The real entry point is Instructorprofile.jsx's
// handleSelectCourse(), which already passes { courseId, courseTitle }
// via location.state -- same pattern CourseDescription.jsx uses on the
// student side.
const FALLBACK_COURSE_ID = 'c1';

function InstructorCourseOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const COURSE_ID = location.state?.courseId || FALLBACK_COURSE_ID;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const course = getCourseInfo(COURSE_ID);

  const [invitations, setInvitations] = useState(() => getInvitationsForCourse(COURSE_ID));

  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const [shareableLink, setShareableLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

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

  // NOTE (flagged deliberately):
  // - 'Overview' here means "course description" (title, syllabus text --
  //   mirrors CourseDescription.jsx's student-facing 'course' view). Not
  //   built yet, disabled placeholder.
  // - 'Students' is what THIS page currently renders (invite by
  //   email/link + invitation list). Renamed from 'Overview' to avoid the
  //   two meanings colliding under one label.
  // - 'Exercises' will lead to exercise creation + Rule Configuration
  //   (the Naming Conventions / Forbidden Practices / etc. mockup) --
  //   that's its own task, not built yet.
  const navItems = [
    { label: 'Overview', icon: <BookIcon />, active: false, disabled: true, onClick: undefined },
    { label: 'Students', icon: <UserIcon />, active: true, disabled: false, onClick: undefined },
    { label: 'Exercises', icon: <CapIcon />, active: false, disabled: true, onClick: undefined },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];

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
    if (invitations.some((inv) => inv.email === trimmed && inv.status === 'pending')) {
      setEmailError('An invitation is already pending for this email.');
      return;
    }

    setSendingEmail(true);
    try {
      // NOTE (flagged deliberately): this only creates the mock record --
      // it does not actually send an email. Real version will call a
      // Lambda (POST /courses/:id/invitations) that both writes the
      // Enrollment record and sends the email via SES.
      sendInvitationByEmail(COURSE_ID, trimmed);
      setInvitations(getInvitationsForCourse(COURSE_ID));
      setConfirmationMessage(`Invitation sent to ${trimmed}`);
      setEmailInput('');
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
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate('/profile/instructor')}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        {/* Invite Students */}
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Invite Students</h2>
          <p style={styles.cardSubtitle}>
            Invite students to <strong>{course.title}</strong> by email, or share a link they can use to join.
          </p>

          <div style={styles.inviteGrid}>
            {/* Shareable link */}
            <div style={styles.inviteColumn}>
              <div style={styles.inviteColumnLabel}>Share a join link</div>
              <button type="button" onClick={handleGenerateLink} style={styles.secondaryButton}>
                Generate Invite Link
              </button>
              {shareableLink && (
                <div style={styles.linkRow}>
                  <input type="text" readOnly value={shareableLink} style={styles.linkInput} />
                  <button type="button" onClick={handleCopyLink} style={styles.copyButton}>
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              )}
            </div>

            {/* Email invite */}
            <div style={styles.inviteColumn}>
              <div style={styles.inviteColumnLabel}>Send a direct invitation</div>
              <form onSubmit={handleSendEmailInvite} style={styles.emailForm}>
                <div style={styles.emailInputWrap}>
                  <span style={styles.emailInputIcon}><MailIcon /></span>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                    placeholder="student@example.com"
                    style={styles.emailInput}
                  />
                </div>
                <button type="submit" disabled={sendingEmail} style={styles.primaryButton}>
                  {sendingEmail ? 'Sending...' : 'Send Invitation'}
                </button>
              </form>
              {emailError && <p style={styles.errorText}>{emailError}</p>}
              {confirmationMessage && <p style={styles.successText}>{confirmationMessage}</p>}
            </div>
          </div>
        </section>

        {/* Invitations list */}
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
                    {inv.email || <span style={{ color: '#999', fontStyle: 'italic' }}>Shareable link</span>}
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
      </main>
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
  inviteGrid: { display: 'flex', gap: '1.5rem', flexWrap: 'wrap' },
  inviteColumn: { flex: 1, minWidth: '260px', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  inviteColumnLabel: { fontSize: '0.78rem', fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.03em' },
  secondaryButton: {
    alignSelf: 'flex-start', padding: '0.6rem 1.1rem', borderRadius: '9px', border: `1px solid ${NAVY}`,
    backgroundColor: '#fff', color: NAVY, fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
  },
  linkRow: { display: 'flex', gap: '0.5rem' },
  linkInput: {
    flex: 1, padding: '0.55rem 0.7rem', borderRadius: '8px', border: '1px solid #d7dce8',
    fontSize: '0.8rem', color: '#555', backgroundColor: '#f9fafc',
  },
  copyButton: {
    padding: '0.55rem 0.9rem', borderRadius: '8px', border: 'none', backgroundColor: NAVY,
    color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  emailForm: { display: 'flex', gap: '0.5rem' },
  emailInputWrap: { position: 'relative', display: 'flex', alignItems: 'center', flex: 1 },
  emailInputIcon: { position: 'absolute', left: '0.7rem', color: '#888', display: 'flex' },
  emailInput: {
    width: '100%', height: '40px', padding: '0 0.7rem 0 2.3rem', borderRadius: '8px',
    border: '1px solid #d7dce8', fontSize: '0.85rem', boxSizing: 'border-box', outline: 'none',
  },
  primaryButton: {
    padding: '0 1.1rem', height: '40px', backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  errorText: { color: '#c00', fontSize: '0.8rem', margin: 0 },
  successText: { color: '#0a7c2f', fontSize: '0.8rem', margin: 0 },
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
};

export default InstructorCourseOverview;