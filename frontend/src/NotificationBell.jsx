// NotificationBell.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY } from './Theme';
import { BellIcon } from './Icons';
import {
  getNotificationsForStudent,
  markNotificationRead,
  markNotificationActioned,
} from './MockNotifications';
import { acceptInvitation, declineInvitation, getExerciseById, getCourseInfo } from './Mockenrollments';

function NotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Load current user email
  useEffect(() => {
    async function loadEmail() {
      try {
        const attrs = await fetchUserAttributes();
        const userEmail = attrs.email || '';
        setEmail(userEmail);
        console.log('[NotificationBell] Student email from Cognito:', userEmail);
      } catch (err) {
        console.warn('Could not fetch user email for notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEmail();
  }, []);

  // Load notifications when email is set
  useEffect(() => {
    if (email) {
      const notifs = getNotificationsForStudent(email);
      console.log('[NotificationBell] Notifications for', email, ':', notifs);
      setNotifications(notifs);
    }
  }, [email]);

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

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleDismiss = (notifId) => {
    markNotificationRead(notifId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
  };

  const handleAcceptInvite = (notif) => {
    if (notif.actioned) return;
    const token = notif.token;
    acceptInvitation(token);
    markNotificationActioned(notif.id);
    markNotificationRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, actioned: true, read: true } : n
      )
    );
    navigate('/courses');
  };

  const handleDeclineInvite = (notif) => {
    if (notif.actioned) return;
    const token = notif.token;
    declineInvitation(token);
    markNotificationActioned(notif.id);
    markNotificationRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, actioned: true, read: true } : n
      )
    );
  };

  const handleViewExercise = (notif) => {
    const exercise = getExerciseById(notif.exerciseId);
    const course = getCourseInfo(notif.courseId);
    if (!exercise || !course) {
      alert('Exercise or course not found.');
      return;
    }
    markNotificationRead(notif.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
    );
    navigate('/submission', {
      state: {
        courseId: notif.courseId,
        courseTitle: course.title,
        exerciseId: exercise.id,
        exerciseTitle: exercise.title,
        exerciseDescription: exercise.description,
        exerciseBadge: exercise.badge,
        maxAttempts: exercise.maxAttempts,
        starterCode: exercise.starterCode,
      },
    });
  };

  // Manual refresh
  const refreshNotifications = () => {
    if (email) {
      const notifs = getNotificationsForStudent(email);
      setNotifications(notifs);
    }
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
            <button onClick={refreshNotifications} style={{ background: 'none', border: 'none', color: NAVY, cursor: 'pointer', fontSize: '0.75rem' }}>
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
                    {notif.type === 'new_exercise' && (
                      <>
                        <div style={styles.notifTitle}>
                          New exercise available
                        </div>
                        <div style={styles.notifMessage}>
                          <strong>{notif.exerciseTitle}</strong> is now open in {notif.courseTitle}.
                        </div>
                        <button
                          onClick={() => handleViewExercise(notif)}
                          style={styles.viewButton}
                        >
                          View Exercise
                        </button>
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