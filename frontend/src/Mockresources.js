// mockResources.js
// NOTE (flagged deliberately): tiny in-memory mock "database" for course
// resources (docs/files instructor uploads so students can consult them
// without copy-pasting a solution). There's no resourcesBucket / upload
// Lambda yet -- StorageConstruct.java only provisions honorCodeBucket and
// submissionsBucket, and ApiConstruct.java has zero routes for resources.
// Replace with real presigned-URL upload + GET /courses/:id/resources once
// that backend exists. Resets on every page refresh (module-level state,
// not persisted).
//
// SIMPLIFICATION (flagged deliberately): only metadata (name, size,
// uploadedAt) is stored -- the actual file bytes are NOT uploaded anywhere,
// since there's no bucket to receive them yet. The file picker is wired up
// so the UI/UX is final, but "Upload" here only records what the user
// picked, it doesn't persist the file content.

const resourcesByCourse = {
  c1: [
    { id: 'res-1', name: 'python-style-guide.pdf', sizeLabel: '240 KB', uploadedAt: '2026-08-10T09:00:00Z' },
  ],
  c2: [],
  c3: [],
};

let resourceCounter = Object.values(resourcesByCourse).reduce((sum, arr) => sum + arr.length, 0);

export function getResourcesForCourse(courseId) {
  if (!resourcesByCourse[courseId]) resourcesByCourse[courseId] = [];
  return resourcesByCourse[courseId]
    .slice()
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
}

export function addResource(courseId, file) {
  if (!resourcesByCourse[courseId]) resourcesByCourse[courseId] = [];
  resourceCounter += 1;
  const newResource = {
    id: `res-${resourceCounter}`,
    name: file.name,
    sizeLabel: formatSize(file.size),
    uploadedAt: new Date().toISOString(),
  };
  resourcesByCourse[courseId].push(newResource);
  return newResource;
}

export function deleteResource(courseId, resourceId) {
  if (!resourcesByCourse[courseId]) return;
  resourcesByCourse[courseId] = resourcesByCourse[courseId].filter((r) => r.id !== resourceId);
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}