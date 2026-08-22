// MockSupport.js
// NOTE (flagged deliberately): in-memory mock store for the "Submit a
// problem" form on the Help page. There is no backend for this yet --
// ApiConstruct.java has zero /support or /contact routes, and no
// DynamoDB table exists to hold these. This only records submissions in
// memory (resets on refresh) so the UI/UX is final and demoable.
// Real version: POST /support -> small Lambda that either writes to a
// SupportRequests table or forwards the message via SES to the team inbox.
// Not scoped into a sprint yet -- flag it to Bilal/BA when you get there.

let supportRequests = [];
let requestCounter = 0;

export function submitSupportRequest({ name, email, message, role }) {
  requestCounter += 1;
  const request = {
    id: `sup-${requestCounter}`,
    name,
    email,
    message,
    role: role || 'unknown',
    createdAt: new Date().toISOString(),
  };
  supportRequests.push(request);
  console.log('[MockSupport] New support request (not sent anywhere yet):', request);
  return request;
}

export function getAllSupportRequests() {
  return supportRequests
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}