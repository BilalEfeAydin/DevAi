// NotificationBell.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { NAVY } from './Theme';
import { BellIcon } from './Icons';

const API_BASE_URL = 'https://lfass4s0ll.execute-api.us-east-1.amazonaws.com';

function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [studentSub, setStudentSub] = useState('');
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  // Track locally dismissed/actioned items (since backend has no "read" field)
  const [dismissed, setDismissed] = useState(new Set());
  const [actioned, setActioned] = useState(new Set());

  // Fetch pending invitations from the real API
  const fetchInvitations = useCallback(async (sub) => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      if (!token) return;

      const res = await fetch(`${API_BASE_URL}/enrollments?studentId=${sub}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.warn('[NotificationBell] Failed to fetch enrollments:', res.status);
        return;
      }

      const data = await res.json();
      const enrollments = data.enrollments || [];

      // Map enrollment items to notification-like objects
      const notifs = enrollments
        .filter((e) => e.Status === 'invited')
        .map((e) => ({
          id: `${e.CourseID}_${e.StudentID}`,
          type: 'invitation',
          courseId: e.CourseID,
          courseTitle: e.CourseTitle || 'Course',
          instructorName: e.InstructorName || 'Instructor',
          createdAt: e.CreatedAt,
          read: dismissed.has(`${e.CourseID}_${e.StudentID}`),
          actioned: actioned.has(`${e.CourseID}_${e.StudentID}`),
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(notifs);
    } catch (err) {
      console.warn('[NotificationBell] Error fetching invitations:', err);
    }
  }, [dismissed, actioned]);

  // Load user sub and initial invitations
  useEffect(() => {
    async function init() {
      try {
        const attrs = await fetchUserAttributes();
        const sub = attrs.sub || '';
        setStudentSub(sub);
        console.log('[NotificationBell] Student sub from Cognito:', sub);
        if (sub) await fetchInvitations(sub);
      } catch (err) {
        console.warn('Could not load user for notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for new invitations every 30 seconds
  useEffect(() => {
    if (!studentSub) return;
    const interval = setInterval(() => fetchInvitations(studentSub), 30000);
    return () => clearInterval(interval);
  }, [studentSub, fetchInvitations]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read && !n.actioned).length;

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleDismiss = (notifId) => {
    setDismissed((prev) => new Set(prev).add(notifId));
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleAcceptInvite = async (notif) => {
    if (notif.actioned) return;
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const res = await fetch(`${API_BASE_URL}/enrollments/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ courseId: notif.courseId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Accept failed:', data.message);
        return;
      }

      setActioned((prev) => new Set(prev).add(notif.id));
      setDismissed((prev) => new Set(prev).add(notif.id));
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notif.id ? { ...n, actioned: true, read: true } : n
        )
      );
      navigate('/courses');
    } catch (err) {
      console.error('Accept invite error:', err);
    }
  };

  const handleDeclineInvite = (notif) => {
    if (notif.actioned) return;
    // For now, just dismiss locally (no backend decline endpoint)
    setActioned((prev) => new Set(prev).add(notif.id));
    setDismissed((prev) => new Set(prev).add(notif.id));
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, actioned: true, read: true } : n
      )
    );
  };

  const refreshNotifications = () => {
    if (studentSub) fetchInvitations(studentSub);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        style={styles.bellButton}
        aria-label="Notifications"
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #e7eaf5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Notifications</span>
            <button 
              onClick={refreshNotifications} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: NAVY, 
                cursor: 'pointer', 
                fontSize: '0.75rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f2ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ↻ Refresh
            </button>
          </div>
          {loading ? (
            <div style={styles.emptyState}>Loading...</div>
          ) : notifications.length === 0 ? (
            <div style={styles.emptyState}>No notifications</div>
          ) : (
            <div style={styles.list}>
              {notifications.map((notif) => (
                <div key={notif.id} style={styles.notificationItem}>
                  <div style={styles.notifContent}>
                    {notif.type === 'invitation' && (
                      <>
                        <div style={styles.notifTitle}>
                          Course invitation
                        </div>
                        <div style={styles.notifMessage}>
                          You've been invited to <strong>{notif.courseTitle}</strong>.
                        </div>
                        {!notif.actioned ? (
                          <div style={styles.actionButtons}>
                            <button
                              onClick={() => handleAcceptInvite(notif)}
                              style={styles.acceptButton}
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineInvite(notif)}
                              style={styles.declineButton}
                            >
                              Decline
                            </button>
                          </div>
                        ) : (
                          <div style={styles.actionedText}>✓ Responded</div>
                        )}
                      </>
                    )}
                  </div>
                  {notif.read ? (
                    <div style={styles.readIndicator}>✔</div>
                  ) : (
                    <button
                      onClick={() => handleDismiss(notif.id)}
                      style={styles.dismissButton}
                      aria-label="Dismiss"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const styles = {
  bellButton: {
    position: 'relative',
    background: 'none',
    border: 'none',
    color: '#666',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.2rem',
    borderRadius: '50%',
    transition: 'background 0.2s',
  },
  badge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#e53e3e',
    color: '#fff',
    borderRadius: '50%',
    padding: '0.15rem 0.4rem',
    fontSize: '0.65rem',
    fontWeight: 700,
    lineHeight: 1,
    minWidth: '1rem',
    textAlign: 'center',
  },
  dropdown: {
    position: 'absolute',
    right: 0,
    top: 'calc(100% + 8px)',
    width: '360px',
    maxHeight: '400px',
    overflowY: 'auto',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(30,42,120,0.15)',
    border: '1px solid #e7eaf5',
    zIndex: 1000,
  },
  emptyState: {
    padding: '1.5rem',
    textAlign: 'center',
    color: '#888',
    fontSize: '0.9rem',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
  },
  notificationItem: {
    display: 'flex',
    alignItems: 'flex-start',
    padding: '0.8rem 1rem',
    borderBottom: '1px solid #f0f1f6',
    gap: '0.5rem',
    transition: 'background 0.1s',
    ':last-child': { borderBottom: 'none' },
  },
  notifContent: {
    flex: 1,
  },
  notifTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: NAVY,
    marginBottom: '0.2rem',
  },
  notifMessage: {
    fontSize: '0.85rem',
    color: '#333',
    marginBottom: '0.4rem',
    lineHeight: 1.4,
  },
  actionButtons: {
    display: 'flex',
    gap: '0.4rem',
    marginTop: '0.2rem',
  },
  acceptButton: {
    padding: '0.2rem 0.8rem',
    borderRadius: '6px',
    border: 'none',
    backgroundColor: NAVY,
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  declineButton: {
    padding: '0.2rem 0.8rem',
    borderRadius: '6px',
    border: '1px solid #d7dce8',
    backgroundColor: '#fff',
    color: '#555',
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  actionedText: {
    fontSize: '0.75rem',
    color: '#0a7c2f',
    fontWeight: 600,
  },
  viewButton: {
    padding: '0.2rem 0.8rem',
    borderRadius: '6px',
    border: `1px solid ${NAVY}`,
    backgroundColor: 'transparent',
    color: NAVY,
    fontSize: '0.75rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  readIndicator: {
    fontSize: '0.7rem',
    color: '#0a7c2f',
    alignSelf: 'center',
  },
  dismissButton: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    padding: '0 0.2rem',
    alignSelf: 'center',
  },
};

export default NotificationBell;