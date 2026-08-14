import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK, styles } from './Theme';
import { CapIcon, BookIcon } from './Icons';

// NOTE (flagged deliberately): mock invitation lookup, keyed by token.
// Replace with a real fetch (e.g. GET /invitations/:token) once the
// Enrollment API exists . Real data will carry the
// same shape: { courseId, courseTitle, instructorName, status }.
// status: 'invited' | 'accepted' | 'declined'
const mockInvitations = {
  'demo-token-c3': {
    courseId: 'c3',
    courseTitle: 'Web Development Basics',
    instructorName: 'Prof. Khelifi',
    status: 'invited',
  },
};

function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [actionState, setActionState] = useState('idle'); // 'idle' | 'accepted' | 'declined'

  useEffect(() => {
    // Look up the invitation from the token
    const found = token ? mockInvitations[token] : null;
    setInvitation(found || null);

    // Check whether the student is already logged in
    async function checkAuth() {
      try {
        await fetchUserAttributes();
        setIsAuthenticated(true);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, [token]);

  const handleAccept = () => {
    // NOTE (flagged deliberately): real version should PATCH the enrollment
    // record (invited -> accepted) once the Enrollment API exists.
    setInvitation((prev) => ({ ...prev, status: 'accepted' }));
    setActionState('accepted');
  };

  const handleDecline = () => {
    setInvitation((prev) => ({ ...prev, status: 'declined' }));
    setActionState('declined');
  };

  const goToLogin = () => {
    navigate('/login', { state: { inviteToken: token } });
  };

  const goToSignup = () => {
    navigate('/signup', { state: { inviteToken: token } });
  };

  // --- Loading state while we check auth ---
  if (!authChecked) {
    return (
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <p style={{ color: '#666' }}>Loading invitation...</p>
        </div>
      </div>
    );
  }

  // --- Invalid / expired token ---
  if (!invitation) {
    return (
      <div style={styles.page}>
        <div style={styles.wrapper}>
          <div style={styles.card}>
            <h2 style={{ color: NAVY, margin: 0 }}>Invitation not found</h2>
            <p style={{ color: '#666', marginTop: '0.6rem' }}>
              This invitation link is invalid or has expired. Ask your instructor to send a new one.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.capIcon}><CapIcon /></span>
            <h1 style={styles.brand}>DevAI</h1>
          </div>
        </div>

        <div style={styles.card}>
          {/* Case: already accepted/declined in this session */}
          {actionState === 'accepted' && (
            <>
              <h2 style={{ color: '#0a7c2f', margin: 0 }}>You're in! 🎉</h2>
              <p style={{ color: '#555', marginTop: '0.6rem' }}>
                You've joined <strong>{invitation.courseTitle}</strong>.
              </p>
              <button type="button" onClick={() => navigate('/courses')} style={{ ...styles.primaryButton, marginTop: '1.2rem' }}>
                Go to My Courses
              </button>
            </>
          )}

          {actionState === 'declined' && (
            <>
              <h2 style={{ color: '#666', margin: 0 }}>Invitation declined</h2>
              <p style={{ color: '#555', marginTop: '0.6rem' }}>
                You won't be enrolled in <strong>{invitation.courseTitle}</strong>.
              </p>
              <button type="button" onClick={() => navigate('/profile/student')} style={{ ...styles.primaryButton, marginTop: '1.2rem' }}>
                Back to Profile
              </button>
            </>
          )}

          {/* Case: logged in, decision pending */}
          {actionState === 'idle' && isAuthenticated && (
            <>
              <span style={{ ...styles.capIcon, display: 'flex', justifyContent: 'center', marginBottom: '0.6rem' }}>
                <BookIcon />
              </span>
              <h2 style={{ color: NAVY, margin: 0, textAlign: 'center' }}>
                Accept invitation to {invitation.courseTitle}?
              </h2>
              <p style={{ color: '#666', marginTop: '0.6rem', textAlign: 'center' }}>
                Invited by {invitation.instructorName}
              </p>
              <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1.4rem' }}>
                <button
                  type="button"
                  onClick={handleDecline}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '9px', border: '1px solid #d7dce8',
                    backgroundColor: '#fff', color: '#555', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Decline
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  style={{
                    flex: 1, padding: '0.7rem', borderRadius: '9px', border: 'none',
                    backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
                    color: '#fff', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Accept
                </button>
              </div>
            </>
          )}

          {/* Case: not logged in yet */}
          {actionState === 'idle' && !isAuthenticated && (
            <>
              <h2 style={{ color: NAVY, margin: 0, textAlign: 'center' }}>
                You've been invited to {invitation.courseTitle}
              </h2>
              <p style={{ color: '#666', marginTop: '0.6rem', textAlign: 'center' }}>
                Invited by {invitation.instructorName}. Log in or create an account to accept.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', marginTop: '1.4rem' }}>
                <button type="button" onClick={goToLogin} style={styles.primaryButton}>
                  I already have an account
                </button>
                <button
                  type="button"
                  onClick={goToSignup}
                  style={{
                    padding: '0.7rem', borderRadius: '9px', border: `1px solid ${NAVY}`,
                    backgroundColor: '#fff', color: NAVY, fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  I'm new here : Sign up
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AcceptInvitation;