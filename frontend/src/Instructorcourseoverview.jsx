import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  BookIcon, CapIcon, BellIcon, HelpIcon,
  MenuIcon, SettingsIcon, UserIcon, MailIcon, FolderIcon,
} from './Icons';
import {
  getCourseInfo, getCourseDetails, getInvitationsForCourse,
  sendInvitationByEmail, generateShareableLink,
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

// Modern pill-style inputs need a real black placeholder, which inline
// styles can't target (::placeholder isn't a real DOM state) -- hence
// this tiny injected stylesheet, same pattern as hoverCSS elsewhere in
// the project (CoursePicker.jsx, CourseDescription.jsx, etc.).
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
`;

function InstructorCourseOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const COURSE_ID = location.state?.courseId || FALLBACK_COURSE_ID;

  const [view, setView] = useState('overview'); // 'overview' | 'students' | 'resources'
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);

  const course = getCourseInfo(COURSE_ID);
  const details = getCourseDetails(COURSE_ID);

  const [invitations, setInvitations] = useState(() => getInvitationsForCourse(COURSE_ID));

  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [confirmationMessage, setConfirmationMessage] = useState('');

  const [shareableLink, setShareableLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  // Resources tab state
  const [resources, setResources] = useState(() => getResourcesForCourse(COURSE_ID));
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

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
  // - 'Overview' = course description (title, notions, rules, tips).
  //   Built now, on this page.
  // - 'Students' = invite by email/link + invitation list. This is what
  //   used to be called 'Overview' before the rename.
  // - 'Resources' = docs/files instructor uploads so students can consult
  //   them without copy-pasting a solution. Different from the honor code
  //   (course-level policy doc, wired to Bedrock via postSubmission) and
  //   different from per-exercise Rule Configuration -- see mockResources.js.
  // - 'Exercises' will lead to exercise creation + Rule Configuration
  //   (Naming Conventions / Forbidden Practices / etc. mockup) -- that's
  //   its own task, not built yet.
  const navItems = [
    { label: 'Overview', icon: <BookIcon />, active: view === 'overview', disabled: false, onClick: () => { setView('overview'); closeSidebar(); } },
    { label: 'Students', icon: <UserIcon />, active: view === 'students', disabled: false, onClick: () => { setView('students'); closeSidebar(); } },
    { label: 'Resources', icon: <FolderIcon />, active: view === 'resources', disabled: false, onClick: () => { setView('resources'); closeSidebar(); } },
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

  // --- Resources handlers ---
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file || null);
  };

  const handleUploadResource = () => {
    if (!selectedFile) return;
    setUploading(true);
    // NOTE (flagged deliberately): no real upload happens here -- see
    // mockResources.js. This just records the file's metadata so the
    // UI/UX is complete and testable ahead of the real S3 + Lambda wiring
    // (POST /courses/:id/resources, same pattern as the honor-code
    // presigned-URL Lambda that's still pending).
    addResource(COURSE_ID, selectedFile);
    setResources(getResourcesForCourse(COURSE_ID));
    setSelectedFile(null);
    setUploading(false);
  };

  const handleDeleteResource = (resourceId) => {
    deleteResource(COURSE_ID, resourceId);
    setResources(getResourcesForCourse(COURSE_ID));
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
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate('/profile/instructor')}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        {/* ============================================================ */}
        {/* OVERVIEW VIEW                                                */}
        {/* ============================================================ */}
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

        {/* ============================================================ */}
        {/* STUDENTS VIEW                                                */}
        {/* ============================================================ */}
        {view === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* Invite Students -- modern aligned rows */}
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Invite Students</h2>
              <p style={styles.cardSubtitle}>
                Invite students to <strong>{course.title}</strong> by email, or share a link they can use to join.
              </p>

              <div style={styles.inviteRowsWrap}>
                {/* Row 1: shareable link */}
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

                {/* Row 2: email invite -- same height/shape as row 1 */}
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
                        {inv.email ? (
                          inv.email
                        ) : (
                          <span style={{ color: '#999', fontStyle: 'italic' }}>Awaiting student access</span>
                        )}
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

        {/* ============================================================ */}
        {/* RESOURCES VIEW                                               */}
        {/* ============================================================ */}
        {view === 'resources' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Course Resources</h2>
              <p style={styles.cardSubtitle}>
                Upload documentation or reference files students can consult on their own -- e.g. a style
                guide or a debugging checklist -- without copy-pasting a solution.
              </p>

              <div style={styles.uploadRow}>
                <label style={styles.fileInputLabel}>
                  {selectedFile ? selectedFile.name : 'Choose a file...'}
                  <input type="file" onChange={handleFileSelect} style={{ display: 'none' }} />
                </label>
                <button
                  type="button"
                  onClick={handleUploadResource}
                  disabled={!selectedFile || uploading}
                  className="invitePillButton"
                  style={styles.pillButtonPrimary}
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </section>

            <section style={styles.card}>
              <h2 style={styles.cardTitle}>Uploaded Resources</h2>
              {resources.length === 0 ? (
                <p style={styles.emptyText}>No resources uploaded yet for this course.</p>
              ) : (
                <div style={styles.table}>
                  <div style={styles.tableHeaderRow}>
                    <span style={{ ...styles.tableCell, flex: 2 }}>File</span>
                    <span style={{ ...styles.tableCell, flex: 1 }}>Size</span>
                    <span style={{ ...styles.tableCell, flex: 1.2 }}>Uploaded</span>
                    <span style={{ ...styles.tableCell, flex: 0.6 }} />
                  </div>
                  {resources.map((res) => (
                    <div key={res.id} style={styles.tableRow}>
                      <span style={{ ...styles.tableCell, flex: 2 }}>{res.name}</span>
                      <span style={{ ...styles.tableCell, flex: 1, color: '#888' }}>{res.sizeLabel}</span>
                      <span style={{ ...styles.tableCell, flex: 1.2, color: '#888', fontSize: '0.8rem' }}>
                        {new Date(res.uploadedAt).toLocaleDateString()}
                      </span>
                      <span style={{ ...styles.tableCell, flex: 0.6 }}>
                        <button type="button" onClick={() => handleDeleteResource(res.id)} style={styles.deleteButton}>
                          Remove
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

  // --- Modern aligned invite rows (Classroom/Moodle-style pills) ---
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

  // --- Resources tab ---
  uploadRow: { display: 'flex', gap: '0.8rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' },
  fileInputLabel: {
    flex: 1, minWidth: '220px', height: '44px', padding: '0 1rem', borderRadius: '999px',
    border: '1px dashed #d7dce8', fontSize: '0.85rem', color: '#555',
    backgroundColor: '#f7f8fc', display: 'flex', alignItems: 'center', cursor: 'pointer',
  },
  deleteButton: {
    background: 'none', border: 'none', color: '#c00', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', padding: 0,
  },
};

export default InstructorCourseOverview;