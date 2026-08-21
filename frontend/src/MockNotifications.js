// MockNotifications.js
// NOTE (flagged deliberately): frontend-only mock notifications store.
// Will be replaced by real API calls (GET /notifications, POST /notifications/read, etc.)
// when the backend team implements the notifications system.

let notifications = [];
let idCounter = 0;

/**
 * Get all notifications for a student email.
 */
export function getNotificationsForStudent(email) {
  return notifications
    .filter((n) => n.studentEmail === email)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * Add a new notification.
 * @param {string} studentEmail - The student's email address.
 * @param {string} type - 'invitation' or 'new_exercise'
 * @param {object} data - Additional data (courseId, courseTitle, token, exerciseId, etc.)
 */
export function addNotification(studentEmail, type, data) {
  const notif = {
    id: ++idCounter,
    studentEmail,
    type,
    ...data,
    createdAt: new Date().toISOString(),
    read: false,
    actioned: false, // used to prevent re-action after accept/decline
  };
  notifications.push(notif);
  return notif;
}

/**
 * Mark a notification as read (dismissed).
 */
export function markNotificationRead(notificationId) {
  const n = notifications.find((n) => n.id === notificationId);
  if (n) n.read = true;
}

/**
 * Mark a notification as actioned (accept/decline already performed).
 */
export function markNotificationActioned(notificationId) {
  const n = notifications.find((n) => n.id === notificationId);
  if (n) n.actioned = true;
}

/**
 * Get a single notification by ID.
 */
export function getNotificationById(notificationId) {
  return notifications.find((n) => n.id === notificationId);
}

/**
 * Find a notification by invitation token.
 */
export function getNotificationByToken(token) {
  return notifications.find((n) => n.token === token);
}