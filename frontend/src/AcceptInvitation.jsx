import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK, styles } from './Theme';
import { CapIcon, BookIcon } from './Icons';
import {
  getInvitationByToken, acceptInvitation, declineInvitation,
  attachEmailToInvitation,
} from './Mockenrollments';

function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [actionState, setActionState] = useState('idle'); // 'idle' | 'accepted' | 'declined'

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const found = token ? getInvitationByToken(token) : null;
      if (!cancelled) setInvitation(found);

      try {
        const attrs = await fetchUserAttributes();
        if (cancelled) return;
        setIsAuthenticated(true);

        // NEW: if this is a generic shareable link (email was still null),
        // attach the signed-in student's real email now, so the
        // instructor sees who actually used the link instead of a
        // "Shareable link" / "Awaiting student access" placeholder.
        if (found && !found.email && attrs.email) {
          attachEmailToInvitation(token, attrs.email);
        }
      } catch {
        if (!cancelled) setIsAuthenticated(false);
      } finally {
        if (!cancelled) setAuthChecked(true);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [token]);

  const handleAccept = () => {
    acceptInvitation(token);
    setInvitation((prev) => ({ ...prev, status: 'accepted' }));
    setActionState('accepted');
  };

  const handleDecline = () => {
    declineInvitation(token);
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
                  I'm new here — Sign up
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