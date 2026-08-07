import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signOut, fetchUserAttributes, fetchAuthSession } from 'aws-amplify/auth';
import { API_BASE_URL } from './amplifyConfig';
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

  const [files, setFiles] = useState([
    { id: 'main', name: 'main.py', content: starterCode },
  ]);
  const [activeFileId, setActiveFileId] = useState('main');
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [fileNameError, setFileNameError] = useState('');

  const activeFile = files.find((f) => f.id === activeFileId) || files[0];

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

  const handleRunTests = async () => {
    // Collect all file contents into a single string (main file first)
    const mainFile = files.find((f) => f.id === 'main') || files[0];
    const code = mainFile.content;

    setOutput({ status: 'running', message: 'Running your code...' });

    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const res = await fetch(`${API_BASE_URL}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          courseId: courseId || 'test-course',
          studentId: session.tokens?.idToken?.payload?.sub || 'unknown',
          content: code,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setOutput({ status: 'error', message: data.message || 'Something went wrong.' });
        return;
      }

      // Build output from E2B execution results
      const exec = data.execution || {};
      setOutput({
        status: exec.executionStatus || 'passed',
        stdout: exec.stdout || [],
        stderr: exec.stderr || [],
        error: exec.error || null,
      });
    } catch (err) {
      console.error('Run Tests error:', err);
      setOutput({ status: 'error', message: err.message || 'Network error.' });
    }
  };

  const handleRunSubmit = async () => {
    if (attemptsUsed >= maxAttempts) return;
    setAttemptsUsed((prev) => prev + 1);
    // For now, Run & Submit does the same as Run Tests.
    // Once Bedrock is integrated, this will also return AI review feedback.
    await handleRunTests();
  };

  const handleCodeChange = (value) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: value } : f))
    );
  };

  const handleAddFile = () => {
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
            <div style={styles.editorTopBar}>
              <div style={styles.fileTabs}>
                {files.map((file) => (
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
              style={styles.codeMirrorWrap}
            />

            <div style={styles.outputPanel}>
              <div style={styles.outputPanelHeader}>Output</div>
              <div style={styles.outputPanelBody}>
                {!output && (
                  <span style={styles.outputTextMuted}>
                    Run your code to see the output here.
                  </span>
                )}
                {output && output.status === 'running' && (
                  <span style={styles.outputTextMuted}>⏳ {output.message}</span>
                )}
                {output && output.status === 'error' && (
                  <span style={{ ...styles.outputText, color: '#e07a7a' }}>❌ {output.message}</span>
                )}
                {output && (output.status === 'passed' || output.status === 'failed') && (
                  <div>
                    {output.stdout && output.stdout.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.72rem', color: '#6b7086', marginBottom: '0.3rem', fontWeight: 600 }}>stdout</div>
                        <pre style={{ ...styles.outputText, color: '#4ade80', margin: 0, whiteSpace: 'pre-wrap' }}>
                          {output.stdout.join('')}
                        </pre>
                      </div>
                    )}
                    {output.stderr && output.stderr.length > 0 && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6b7086', marginBottom: '0.3rem', fontWeight: 600 }}>stderr</div>
                        <pre style={{ ...styles.outputText, color: '#facc15', margin: 0, whiteSpace: 'pre-wrap' }}>
                          {output.stderr.join('')}
                        </pre>
                      </div>
                    )}
                    {output.error && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <div style={{ fontSize: '0.72rem', color: '#6b7086', marginBottom: '0.3rem', fontWeight: 600 }}>error</div>
                        <pre style={{ ...styles.outputText, color: '#e07a7a', margin: 0, whiteSpace: 'pre-wrap' }}>
{output.error.name}: {output.error.value}
{output.error.traceback}
                        </pre>
                      </div>
                    )}
                    {(!output.stdout || output.stdout.length === 0) && !output.error && (
                      <span style={styles.outputTextMuted}>Code ran successfully with no output.</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div style={styles.actionRow}>
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
              <p style={styles.inquiryCardText}>
                Your AI reviewer's guiding questions will appear here once you submit your first attempt.
              </p>
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
};

export default Submission;