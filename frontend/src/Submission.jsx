import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { vscodeDark } from '@uiw/codemirror-theme-vscode';
import { NAVY } from './Theme';
import Sidebar from './Sidebar';
import {
  BookIcon, CapIcon, BellIcon, HelpIcon,
  MenuIcon, SettingsIcon, PlusIcon,
} from './Icons';

// TODO: only Python has real syntax highlighting for now (only @codemirror/lang-python
// is installed). Files with other extensions render as plain text -- no coloring --
// rather than being wrongly colored as Python. Add @codemirror/lang-html,
// @codemirror/lang-css, @codemirror/lang-javascript here once the team confirms
// which languages exercises actually need.
const getLanguageExtension = (filename) => {
  if (filename.endsWith('.py')) return [python()];
  return [];
};

function Submission() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    courseId, courseTitle,
    exerciseTitle = 'Exercise',
    exerciseDescription = 'No description available for this exercise yet.',
    exerciseBadge = 'General',
    maxAttempts = 5,
    starterCode = '# Write your solution here\n\n',
  } = location.state || {};

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [output, setOutput] = useState(null); // { status: 'running'|'placeholder', message: string }

  // MOCK: shape matches what the Bedrock Socratic-review Lambda is expected
  // to return once Sprint 3's "Wire Bedrock into Lambda pipeline" is done.
  // Replace generateMockFeedback() with the real API response when ready.
  // NOTE: this is the feedback for the LIVE/current attempt only. Past
  // attempts keep their own frozen feedback inside attemptHistory (see below).
  const [aiFeedback, setAiFeedback] = useState(null);

  // attempt history , each entry is a FROZEN snapshot of files + feedback
  // taken at the moment "Run & Submit" was clicked. This is what lets the
  // student scroll back through past attempts. Replace with a real fetch from
  // the Submissions table (StudentIndex GSI, sorted by CreatedAt) once that
  // backend piece exists — the shape below should stay compatible.
  const [attemptHistory, setAttemptHistory] = useState([]);
  const [viewingAttemptNumber, setViewingAttemptNumber] = useState(null); // null = viewing the live/current attempt

  const [files, setFiles] = useState([
    { id: 'main', name: 'main.py', content: starterCode },
  ]);
  const [activeFileId, setActiveFileId] = useState('main');
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileNameError, setFileNameError] = useState('');

  // Which attempt are we looking at? null = the live, editable attempt.
  const viewingSnapshot = viewingAttemptNumber !== null
    ? attemptHistory.find((a) => a.attemptNumber === viewingAttemptNumber)
    : null;
  const isViewingPast = viewingSnapshot !== null;

  // Files/feedback actually shown depend on whether we're viewing history or the live attempt.
  // EVERYTHING in the JSX below must read from these two (displayedFiles /
  // displayedFeedback), never directly from `files` or `aiFeedback` --
  // otherwise the tabs/history UI silently shows live data while looking
  // like it's showing a past attempt.
  const displayedFiles = isViewingPast ? viewingSnapshot.files : files;
  const displayedFeedback = isViewingPast ? viewingSnapshot.feedback : aiFeedback;
  const activeFile = displayedFiles.find((f) => f.id === activeFileId) || displayedFiles[0];

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

  const navItems = [
    {
      label: 'Course', icon: <BookIcon />, active: false, disabled: false,
      onClick: () => navigate('/course-description', { state: { courseId, courseTitle } }),
    },
    {
      label: 'Exercises', icon: <CapIcon />, active: true, disabled: false,
      onClick: () => navigate('/course-description', { state: { courseId, courseTitle, initialView: 'exercises' } }),
    },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];

  const handleRunTests = () => {
    // TODO: connect to real Lambda test-runner once backend is ready.
    // For now this just shows a placeholder in the output panel so the
    // UI flow is testable before the backend call exists.
    setOutput({
      status: 'placeholder',
      message: 'Test runner not connected yet — this panel will show real test results once the backend Lambda is wired in.',
    });
  };

  const generateMockFeedback = () => ({
    status: 'needs_work', // 'needs_work' | 'on_track'
    questions: [
      { id: 'q1', text: 'What happens to your loop variable when the list is empty?', line: 4 },
      { id: 'q2', text: 'Could two different inputs produce the same output here? Why or why not?', line: 7 },
    ],
  });

  const handleRunSubmit = () => {
    if (attemptsUsed >= maxAttempts) return; // safety net, button shouldn't be visible at this point
    const newAttemptNumber = attemptsUsed + 1;
    const feedback = generateMockFeedback();

    setAttemptHistory((prev) => [
      ...prev,
      {
        attemptNumber: newAttemptNumber,
        files: files.map((f) => ({ ...f })), // shallow copy so later edits to `files` don't mutate history
        feedback,
        timestamp: new Date().toISOString(),
      },
    ]);

    setAttemptsUsed(newAttemptNumber);
    setAiFeedback(feedback);
    setViewingAttemptNumber(null); // stay on the live attempt right after submitting
    setOutput({
      status: 'placeholder',
      message: 'Attempt recorded. AI review not connected yet — this panel will show the Socratic reviewer output once the backend Lambda is wired in.',
    });
  };

  const handleCodeChange = (value) => {
    if (isViewingPast) return; // safety net -- editor is readOnly, but block writes at the state level too
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
    );
  };

  const handleAddFile = () => {
    if (isViewingPast) return;
    setFileNameError('');
    setNewFileName('');
    setIsAddingFile(true);
  };

  const confirmAddFile = () => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      setIsAddingFile(false);
      return;
    }
    if (files.some((f) => f.name === trimmed)) {
      setFileNameError('A file with that name already exists.');
      return;
    }
    const newFile = { id: `${trimmed}-${Date.now()}`, name: trimmed, content: '' };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
    setIsAddingFile(false);
    setNewFileName('');
    setFileNameError('');
  };

  const cancelAddFile = () => {
    setIsAddingFile(false);
    setNewFileName('');
    setFileNameError('');
  };

  const handleFileNameKeyDown = (e) => {
    if (e.key === 'Enter') confirmAddFile();
    if (e.key === 'Escape') cancelAddFile();
  };

  const handleCloseFile = (fileId, event) => {
    event.stopPropagation(); // don't switch tabs when clicking the X
    if (isViewingPast) return;
    if (files.length === 1) {
      alert('You need at least one file open.');
      return;
    }
    const remaining = files.filter((f) => f.id !== fileId);
    setFiles(remaining);
    if (activeFileId === fileId) {
      setActiveFileId(remaining[0].id);
    }
  };

  return (
    <div style={styles.page}>
      <Sidebar
        subtitle={courseTitle || 'Course'}
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
            <h1 style={styles.pageTitle}>{exerciseTitle}</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.attemptCounter}>{attemptsUsed} attempt{attemptsUsed !== 1 ? 's' : ''} / {maxAttempts}</span>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate('/profile/student')}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        <div style={styles.workArea}>
          <div style={styles.editorColumn}>
            {attemptHistory.length > 0 && (
              <div style={styles.attemptTabsRow}>
                {attemptHistory.map((attempt) => (
                  <div
                    key={attempt.attemptNumber}
                    onClick={() => setViewingAttemptNumber(attempt.attemptNumber)}
                    style={
                      viewingAttemptNumber === attempt.attemptNumber
                        ? styles.attemptTabActive
                        : styles.attemptTab
                    }
                  >
                    Attempt {attempt.attemptNumber}
                  </div>
                ))}
                <div
                  onClick={() => setViewingAttemptNumber(null)}
                  style={
                    viewingAttemptNumber === null
                      ? styles.attemptTabActive
                      : styles.attemptTab
                  }
                >
                  Current
                </div>
              </div>
            )}

            <div style={styles.editorTopBar}>
              <div style={styles.fileTabs}>
                {displayedFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActiveFileId(file.id)}
                    style={file.id === activeFileId ? styles.fileTabActive : styles.fileTab}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleCloseFile(file.id, e)}
                      style={styles.fileTabClose}
                      aria-label={`Close ${file.name}`}
                    >
                      ×
                    </button>
                    <span>{file.name}</span>
                  </div>
                ))}
                {isAddingFile ? (
                  <div style={styles.newFileInputWrap}>
                    <input
                      type="text"
                      autoFocus
                      value={newFileName}
                      onChange={(e) => { setNewFileName(e.target.value); setFileNameError(''); }}
                      onKeyDown={handleFileNameKeyDown}
                      onBlur={confirmAddFile}
                      placeholder="file name..."
                      style={styles.newFileInput}
                    />
                    {fileNameError && <span style={styles.newFileError}>{fileNameError}</span>}
                  </div>
                ) : (
                  <button type="button" onClick={handleAddFile} style={styles.addFileButton} aria-label="Add file">
                    <PlusIcon />
                  </button>
                )}
              </div>
              <span style={styles.languageLabel}>
                {(activeFile.name.split('.').pop() || 'txt').toUpperCase()}
              </span>
            </div>

            <CodeMirror
              value={activeFile.content}
              height="480px"
              theme={vscodeDark}
              extensions={getLanguageExtension(activeFile.name)}
              onChange={handleCodeChange}
              readOnly={isViewingPast}
              style={styles.codeMirrorWrap}
            />

            <div style={styles.outputPanel}>
              <div style={styles.outputPanelHeader}>Output</div>
              <div style={styles.outputPanelBody}>
                {output ? (
                  <span style={output.status === 'placeholder' ? styles.outputTextMuted : styles.outputText}>
                    {output.message}
                  </span>
                ) : (
                  <span style={styles.outputTextMuted}>
                    Run your code to see the output here.
                  </span>
                )}
              </div>
            </div>

            <div style={styles.actionRow}>
              {isViewingPast ? (
                <button type="button" onClick={() => setViewingAttemptNumber(null)} style={styles.runSubmitButton}>
                  Back to Current Attempt
                </button>
              ) : (
                <>
                  <button type="button" onClick={handleRunTests} style={styles.runTestsButton}>
                    Run Tests
                  </button>
                  {attemptsUsed < maxAttempts ? (
                    <button type="button" onClick={handleRunSubmit} style={styles.runSubmitButton}>
                      Run & Submit
                    </button>
                  ) : (
                    <span style={styles.attemptsExhaustedText}>
                      No attempts remaining
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div style={styles.descriptionColumn}>
            <span style={styles.badge}>{exerciseBadge}</span>
            <h2 style={styles.exerciseTitleText}>{exerciseTitle}</h2>

            <div style={styles.descriptionCard}>
              <h3 style={styles.descriptionCardTitle}>Exercise Description</h3>
              <p style={styles.descriptionCardText}>{exerciseDescription}</p>
            </div>

            <div style={styles.inquiryCard}>
              <h3 style={styles.inquiryCardTitle}>Socratic Inquiry</h3>
              {!displayedFeedback ? (
                <p style={styles.inquiryCardText}>
                  Your AI reviewer's guiding questions will appear here once you submit your first attempt.
                </p>
              ) : (
                <ol style={styles.feedbackList}>
                  {displayedFeedback.questions.map((q) => (
                    <li key={q.id} style={styles.feedbackItem}>
                      <span style={styles.feedbackLineTag}>Line {q.line}</span>
                      <span>{q.text}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', background: '#f5f7fb', fontFamily: 'system-ui, -apple-system, sans-serif' },
  main: { flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.2rem' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  hamburgerButton: { background: 'none', border: 'none', color: NAVY, cursor: 'pointer', display: 'flex', padding: '0.2rem', borderRadius: '6px' },
  pageTitle: { color: '#1a1a1a', fontSize: '1.3rem', fontWeight: 800, margin: 0 },
  headerIcons: { display: 'flex', alignItems: 'center', gap: '1rem' },
  attemptCounter: {
    fontSize: '0.8rem', fontWeight: 600, color: NAVY, backgroundColor: 'rgba(30,42,120,0.08)',
    padding: '0.35rem 0.8rem', borderRadius: '999px',
  },
  headerIconButton: { color: '#666', display: 'flex', cursor: 'pointer' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: '50%', backgroundColor: NAVY, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
    fontWeight: 700, cursor: 'pointer',
  },
  workArea: { display: 'flex', gap: '1.2rem', alignItems: 'flex-start' },
  editorColumn: {
    flex: 2, backgroundColor: '#161822', borderRadius: '12px', padding: '1rem',
    display: 'flex', flexDirection: 'column', gap: '0.8rem',
  },
  editorTopBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' },
  fileTabs: { display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' },
  attemptTabsRow: { display: 'flex', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' },
  attemptTab: {
    padding: '0.28rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600,
    color: '#aab0c8', backgroundColor: 'transparent', border: '1px solid #2e303a', cursor: 'pointer',
  },
  attemptTabActive: {
    padding: '0.28rem 0.7rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
    color: '#fff', backgroundColor: NAVY, border: `1px solid ${NAVY}`, cursor: 'pointer',
  },
  fileTab: {
    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem',
    borderRadius: '6px', backgroundColor: 'transparent', color: '#aab0c8',
    fontSize: '0.78rem', cursor: 'pointer', border: '1px solid transparent',
  },
  fileTabActive: {
    display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.6rem',
    borderRadius: '6px', backgroundColor: '#22242f', color: '#fff',
    fontSize: '0.78rem', cursor: 'pointer', border: '1px solid #2e303a', fontWeight: 600,
  },
  fileTabClose: {
    background: 'none', border: 'none', color: '#aab0c8', cursor: 'pointer',
    fontSize: '0.9rem', lineHeight: 1, padding: 0,
  },
  languageLabel: { fontSize: '0.75rem', color: '#aab0c8', fontWeight: 600 },
  addFileButton: {
    width: 26, height: 26, borderRadius: '6px', border: '1px solid #2e303a', backgroundColor: 'transparent',
    color: '#aab0c8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  newFileInputWrap: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  newFileInput: {
    width: 130, padding: '0.28rem 0.5rem', borderRadius: '6px', border: `1px solid ${NAVY}`,
    backgroundColor: '#0f1017', color: '#fff', fontSize: '0.78rem', outline: 'none',
  },
  newFileError: { fontSize: '0.7rem', color: '#e07a7a' },
  codeMirrorWrap: { borderRadius: '8px', overflow: 'hidden', textAlign: 'left', fontSize: '0.85rem' },
  outputPanel: {
    backgroundColor: '#0f1017', borderRadius: '8px', border: '1px solid #2e303a',
    minHeight: '110px', display: 'flex', flexDirection: 'column',
  },
  outputPanelHeader: {
    padding: '0.5rem 0.8rem', fontSize: '0.72rem', fontWeight: 700, color: '#aab0c8',
    borderBottom: '1px solid #2e303a', textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  outputPanelBody: { padding: '0.7rem 0.8rem', textAlign: 'left', flex: 1 },
  outputText: { fontSize: '0.82rem', color: '#e2e4ee', lineHeight: 1.5, fontFamily: 'ui-monospace, Consolas, monospace' },
  outputTextMuted: { fontSize: '0.8rem', color: '#6b7086', lineHeight: 1.5, fontFamily: 'ui-monospace, Consolas, monospace' },
  actionRow: { display: 'flex', gap: '0.7rem', justifyContent: 'flex-end', alignItems: 'center' },
  runTestsButton: {
    padding: '0.6rem 1.2rem', backgroundColor: '#14b8a6', color: '#08221f', border: 'none',
    borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
  },
  runSubmitButton: {
    padding: '0.6rem 1.2rem', backgroundColor: NAVY, color: '#fff', border: 'none',
    borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
  },
  attemptsExhaustedText: {
    fontSize: '0.8rem', color: '#c0392b', fontWeight: 600,
  },
  descriptionColumn: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.9rem' },
  badge: {
    alignSelf: 'flex-start', fontSize: '0.7rem', fontWeight: 700, color: '#7c3aed',
    backgroundColor: '#f3ecff', padding: '0.3rem 0.7rem', borderRadius: '999px',
    textTransform: 'uppercase', letterSpacing: '0.03em',
  },
  exerciseTitleText: { color: '#1a1a1a', fontSize: '1.15rem', margin: 0 },
  descriptionCard: {
    backgroundColor: '#fff', borderRadius: '12px', padding: '1.1rem',
    border: '1px solid #e7eaf5', boxShadow: '0 2px 8px rgba(30,42,120,0.04)',
  },
  descriptionCardTitle: { color: '#1a1a1a', fontSize: '0.9rem', margin: '0 0 0.5rem' },
  descriptionCardText: { color: '#555', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 },
  inquiryCard: {
    backgroundColor: '#f5f7ff', border: '1px solid #dde3fa',
    borderRadius: '12px', padding: '1.1rem',
  },
  inquiryCardTitle: { color: NAVY, fontSize: '0.9rem', margin: '0 0 0.5rem' },
  inquiryCardText: { color: '#666', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 },
  feedbackList: { margin: 0, paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  feedbackItem: { fontSize: '0.85rem', color: '#444', lineHeight: 1.5 },
  feedbackLineTag: {
    display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, color: NAVY,
    backgroundColor: 'rgba(30,42,120,0.08)', padding: '0.1rem 0.4rem', borderRadius: '4px',
    marginRight: '0.4rem',
  },
};

export default Submission;