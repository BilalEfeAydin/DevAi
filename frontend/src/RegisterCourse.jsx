import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  BookIcon, CapIcon, BellIcon, HelpIcon,
  MenuIcon, SettingsIcon, PlusIcon, UserIcon,
  FolderIcon, InboxIcon, ChartIcon,
  LockIcon, MailIcon,
} from './Icons';
import { registerCourse } from './Mockenrollments';

// Color palette for sections
const COLORS = {
  info: '#1e2a78',
  naming: '#7c3aed',
  structure: '#0e9f6e',
  complexity: '#f59e0b',
  forbidden: '#ef4444',
  required: '#3b82f6',
  document: '#8b5cf6',
  strictness: '#14b8a6',
};

// FIX: Card must live OUTSIDE the RegisterCourse component. It was
// previously defined inside the component body -- that meant every
// keystroke (every setState) caused RegisterCourse to re-render, which
// created a BRAND NEW Card function on every render. React saw a
// different component reference each time and unmounted + remounted the
// entire subtree (including every <input>) instead of just updating it.
// That's what caused "only one letter typeable" + page latency -- each
// keystroke was destroying and rebuilding the whole form.
const Card = ({ title, icon, color, children }) => (
  <div style={{ ...styles.card, borderTop: `4px solid ${color}` }}>
    <div style={styles.cardHeader}>
      <span style={{ ...styles.titleBadge, backgroundColor: color }}>
        <span style={styles.badgeIcon}>{icon}</span>
        {title}
      </span>
    </div>
    {children}
  </div>
);

function RegisterCourse() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [namingRules, setNamingRules] = useState({
    camelCase: false,
    PascalCase: false,
    UPPER_CASE: false,
    custom: [],
  });
  const [customNaming, setCustomNaming] = useState('');
  const [functionLengthLimit, setFunctionLengthLimit] = useState(50);
  const [maxNestingLevels, setMaxNestingLevels] = useState(3);
  const [complexityLimit, setComplexityLimit] = useState('');
  const [forbiddenPractices, setForbiddenPractices] = useState({
    globalVariables: false,
    hardcodedSecrets: false,
    custom: [],
  });
  const [customForbidden, setCustomForbidden] = useState('');
  const [requiredPatterns, setRequiredPatterns] = useState({
    docstrings: false,
    unitTests: false,
    custom: [],
  });
  const [customRequired, setCustomRequired] = useState('');
  const [documentFile, setDocumentFile] = useState(null);
  const [documentText, setDocumentText] = useState('');
  const [strictness, setStrictness] = useState('Medium');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fileInputRef = useRef(null);

  // FIX: this was `useState(() => {...}, [])`, which is wrong -- useState's
  // second argument is silently ignored, and running an async side effect
  // inside a lazy state initializer runs during the render phase, not
  // after mount. useEffect is the correct hook for "run this once after
  // the component mounts."
  useEffect(() => {
    async function loadProfile() {
      try {
        const attrs = await fetchUserAttributes();
        setFirstName(attrs.name || '');
        setLastName(attrs.family_name || '');
      } catch (err) {
        console.warn('Could not load profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  const getInitials = () => {
    const f = firstName.charAt(0).toUpperCase();
    const l = lastName.charAt(0).toUpperCase();
    return f + l || '?';
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
    { label: 'Profile', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate('/profile/instructor') },
{ label: 'Help', icon: <HelpIcon />, active: false, disabled: false, onClick: () => navigate('/help') },  ];

  // Handlers for adding custom rules
  const addCustomNaming = () => {
    const trimmed = customNaming.trim();
    if (trimmed && !namingRules.custom.includes(trimmed)) {
      setNamingRules({ ...namingRules, custom: [...namingRules.custom, trimmed] });
      setCustomNaming('');
    }
  };
  const removeCustomNaming = (item) => {
    setNamingRules({ ...namingRules, custom: namingRules.custom.filter(r => r !== item) });
  };

  const addCustomForbidden = () => {
    const trimmed = customForbidden.trim();
    if (trimmed && !forbiddenPractices.custom.includes(trimmed)) {
      setForbiddenPractices({ ...forbiddenPractices, custom: [...forbiddenPractices.custom, trimmed] });
      setCustomForbidden('');
    }
  };
  const removeCustomForbidden = (item) => {
    setForbiddenPractices({ ...forbiddenPractices, custom: forbiddenPractices.custom.filter(r => r !== item) });
  };

  const addCustomRequired = () => {
    const trimmed = customRequired.trim();
    if (trimmed && !requiredPatterns.custom.includes(trimmed)) {
      setRequiredPatterns({ ...requiredPatterns, custom: [...requiredPatterns.custom, trimmed] });
      setCustomRequired('');
    }
  };
  const removeCustomRequired = (item) => {
    setRequiredPatterns({ ...requiredPatterns, custom: requiredPatterns.custom.filter(r => r !== item) });
  };

  // File upload handlers
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'text/plain') {
      setDocumentFile(file);
      // NOTE (flagged deliberately): reading the file as text client-side so
      // the mock has real content to show/test with. The REAL backend flow
      // must NOT send this text in a request body to be stored as-is in
      // DynamoDB (400KB item limit, and it's the wrong field for it per
      // Courses.HonorCodeDocURI's naming). Real flow: PUT the raw file
      // directly to S3 via a presigned URL, store only the resulting URI.
      const reader = new FileReader();
      reader.onload = (event) => setDocumentText(event.target.result || '');
      reader.onerror = () => setError('Could not read the file. Please try again.');
      reader.readAsText(file);
    } else {
      setError('Please select a .txt file.');
      e.target.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  // Submit
  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }

    const rules = {
      naming: {
        camelCase: namingRules.camelCase,
        PascalCase: namingRules.PascalCase,
        UPPER_CASE: namingRules.UPPER_CASE,
        custom: namingRules.custom,
      },
      structure: {
        functionLengthLimit: Number(functionLengthLimit),
        maxNestingLevels: Number(maxNestingLevels),
      },
      complexity: {
        cyclomaticLimit: complexityLimit ? Number(complexityLimit) : null,
      },
      forbidden: {
        globalVariables: forbiddenPractices.globalVariables,
        hardcodedSecrets: forbiddenPractices.hardcodedSecrets,
        custom: forbiddenPractices.custom,
      },
      required: {
        docstrings: requiredPatterns.docstrings,
        unitTests: requiredPatterns.unitTests,
        custom: requiredPatterns.custom,
      },
      strictness,
      documentName: documentFile ? documentFile.name : 'No document uploaded',
    };

    try {
      registerCourse({
        title: title.trim(),
        description: description.trim() || 'No description provided.',
        instructorName: `${firstName} ${lastName}`.trim() || 'Instructor',
        rules,
        honorCodeText: documentText,
      });
      setSuccess('Course registered successfully!');
      setTimeout(() => navigate('/profile/instructor'), 1500);
    } catch (err) {
      setError(err.message || 'Failed to register course.');
    }
  };

  return (
    <div style={styles.page}>
      <Sidebar
        subtitle="Register Course"
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
            <h1 style={styles.pageTitle}>Register New Course</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
<span style={styles.headerIconButton} onClick={() => navigate('/settings')}><SettingsIcon /></span>            <span style={styles.avatarCircle}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Course Information */}
          <Card title="Course Information" icon={<BookIcon />} color={COLORS.info}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Course Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={styles.input}
                placeholder="e.g. CS101 Intro to Python"
                required
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...styles.input, ...styles.textarea }}
                placeholder="Course description..."
              />
            </div>
          </Card>

          {/* Naming Conventions */}
          <Card title="Naming Conventions" icon={<FolderIcon />} color={COLORS.naming}>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={namingRules.camelCase} onChange={() => setNamingRules({ ...namingRules, camelCase: !namingRules.camelCase })} />
                camelCase for variables
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={namingRules.PascalCase} onChange={() => setNamingRules({ ...namingRules, PascalCase: !namingRules.PascalCase })} />
                PascalCase for classes
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={namingRules.UPPER_CASE} onChange={() => setNamingRules({ ...namingRules, UPPER_CASE: !namingRules.UPPER_CASE })} />
                UPPER_CASE for constants
              </label>
            </div>
            <div style={styles.addRow}>
              <input
                type="text"
                value={customNaming}
                onChange={(e) => setCustomNaming(e.target.value)}
                onKeyDown={(e) => {
                  // FIX: pressing Enter inside ANY text input nested in a
                  // <form> triggers native form submission by default --
                  // even though the "Add" button next to it is type="button"
                  // and has nothing to do with it. That was firing
                  // handleSubmit() (creating the course + navigating back to
                  // profile) instead of just adding this tag. preventDefault
                  // stops the implicit submit; we call the intended action
                  // ourselves.
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomNaming();
                  }
                }}
                placeholder="Add custom rule..."
                style={{ ...styles.input, flex: 1 }}
              />
              <button type="button" onClick={addCustomNaming} style={styles.addButton}>Add</button>
            </div>
            <div style={styles.tagList}>
              {namingRules.custom.map((rule) => (
                <span key={rule} style={{ ...styles.tag, backgroundColor: `${COLORS.naming}15`, color: COLORS.naming }}>
                  {rule} <span onClick={() => removeCustomNaming(rule)} style={styles.tagRemove}>×</span>
                </span>
              ))}
            </div>
          </Card>

          {/* Code Structure */}
          <Card title="Code Structure Rules" icon={<ChartIcon />} color={COLORS.structure}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Function Length Limit</label>
              <div style={styles.rowWithSuffix}>
                <input
                  type="number"
                  value={functionLengthLimit}
                  onChange={(e) => setFunctionLengthLimit(Number(e.target.value))}
                  style={{ ...styles.input, maxWidth: '120px' }}
                  min={1}
                />
                <span style={styles.suffix}>Lines</span>
              </div>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Max Nesting Levels</label>
              <div style={styles.rowWithSuffix}>
                <input
                  type="number"
                  value={maxNestingLevels}
                  onChange={(e) => setMaxNestingLevels(Number(e.target.value))}
                  style={{ ...styles.input, maxWidth: '120px' }}
                  min={1}
                />
                <span style={styles.suffix}>Levels</span>
              </div>
            </div>
          </Card>

          {/* Complexity Constraints */}
          <Card title="Complexity Constraints" icon={<InboxIcon />} color={COLORS.complexity}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Cyclomatic Complexity Limit</label>
              <input
                type="number"
                value={complexityLimit}
                onChange={(e) => setComplexityLimit(e.target.value)}
                style={{ ...styles.input, maxWidth: '150px' }}
                placeholder="e.g. 10"
                min={1}
              />
            </div>
          </Card>

          {/* Forbidden Practices */}
          <Card title="Forbidden Practices" icon={<LockIcon />} color={COLORS.forbidden}>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={forbiddenPractices.globalVariables} onChange={() => setForbiddenPractices({ ...forbiddenPractices, globalVariables: !forbiddenPractices.globalVariables })} />
                Global variables
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={forbiddenPractices.hardcodedSecrets} onChange={() => setForbiddenPractices({ ...forbiddenPractices, hardcodedSecrets: !forbiddenPractices.hardcodedSecrets })} />
                Hardcoded secrets
              </label>
            </div>
            <div style={styles.addRow}>
              <input
                type="text"
                value={customForbidden}
                onChange={(e) => setCustomForbidden(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomForbidden();
                  }
                }}
                placeholder="Custom ban..."
                style={{ ...styles.input, flex: 1 }}
              />
              <button type="button" onClick={addCustomForbidden} style={styles.addButton}>Add</button>
            </div>
            <div style={styles.tagList}>
              {forbiddenPractices.custom.map((rule) => (
                <span key={rule} style={{ ...styles.tag, backgroundColor: `${COLORS.forbidden}15`, color: COLORS.forbidden }}>
                  {rule} <span onClick={() => removeCustomForbidden(rule)} style={styles.tagRemove}>×</span>
                </span>
              ))}
            </div>
          </Card>

          {/* Required Patterns */}
          <Card title="Required Patterns" icon={<CapIcon />} color={COLORS.required}>
            <div style={styles.checkboxGroup}>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={requiredPatterns.docstrings} onChange={() => setRequiredPatterns({ ...requiredPatterns, docstrings: !requiredPatterns.docstrings })} />
                Docstrings for all public methods
              </label>
              <label style={styles.checkboxLabel}>
                <input type="checkbox" checked={requiredPatterns.unitTests} onChange={() => setRequiredPatterns({ ...requiredPatterns, unitTests: !requiredPatterns.unitTests })} />
                Unit tests for core logic
              </label>
            </div>
            <div style={styles.addRow}>
              <input
                type="text"
                value={customRequired}
                onChange={(e) => setCustomRequired(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomRequired();
                  }
                }}
                placeholder="Add required pattern..."
                style={{ ...styles.input, flex: 1 }}
              />
              <button type="button" onClick={addCustomRequired} style={styles.addButton}>Add</button>
            </div>
            <div style={styles.tagList}>
              {requiredPatterns.custom.map((rule) => (
                <span key={rule} style={{ ...styles.tag, backgroundColor: `${COLORS.required}15`, color: COLORS.required }}>
                  {rule} <span onClick={() => removeCustomRequired(rule)} style={styles.tagRemove}>×</span>
                </span>
              ))}
            </div>
          </Card>

          {/* Document Integration */}
          <Card title="Document Integration" icon={<MailIcon />} color={COLORS.document}>
            <p style={styles.hint}>
              Upload a .txt file (e.g., syllabus, honor code). The AI will use this to enforce course-specific policies.
            </p>
            <input
              type="file"
              accept=".txt"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div style={styles.fileUploadRow}>
              <div style={styles.fileDisplay}>
                {documentFile ? (
                  <span style={styles.fileName}>{documentFile.name}</span>
                ) : (
                  <span style={styles.filePlaceholder}>No file selected</span>
                )}
              </div>
              <button type="button" onClick={triggerFileInput} style={{ ...styles.addButton, borderColor: COLORS.document, color: COLORS.document }}>
                Choose .txt file
              </button>
            </div>
          </Card>

          {/* Strictness */}
          <Card title="Reviewer Strictness" icon={<ChartIcon />} color={COLORS.strictness}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Strictness Level</label>
              <select
                value={strictness}
                onChange={(e) => setStrictness(e.target.value)}
                style={{ ...styles.input, maxWidth: '200px' }}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>
          </Card>

          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}

          <div style={styles.buttonRow}>
            <button type="button" onClick={() => navigate('/profile/instructor')} style={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" style={styles.submitButton}>
              Register Course
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f5f7fb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  main: {
    flex: 1,
    padding: '1.5rem 2rem',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1.5rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  hamburgerButton: {
    background: 'none',
    border: 'none',
    color: NAVY,
    cursor: 'pointer',
    display: 'flex',
    padding: '0.2rem',
    borderRadius: '6px',
  },
  pageTitle: {
    color: '#1a1a1a',
    fontSize: '1.5rem',
    fontWeight: 800,
    margin: 0,
  },
  headerIcons: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  headerIconButton: {
    color: '#666',
    display: 'flex',
    cursor: 'pointer',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: '50%',
    backgroundColor: NAVY,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.85rem',
    fontWeight: 700,
    cursor: 'pointer',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.2rem',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem',
    borderTop: `4px solid ${NAVY}`,
  },
  cardHeader: {
    marginBottom: '1rem',
  },
  titleBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.3rem 1rem',
    borderRadius: '999px',
    color: '#fff',
    fontSize: '0.85rem',
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  badgeIcon: {
    display: 'flex',
    fontSize: '1rem',
  },
  fieldGroup: {
    marginBottom: '1rem',
    '&:last-child': { marginBottom: 0 },
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#333',
    marginBottom: '0.3rem',
  },
  input: {
    width: '100%',
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #d7dce8',
    fontSize: '0.9rem',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
    ':focus': {
      borderColor: NAVY,
      boxShadow: `0 0 0 3px rgba(30,42,120,0.12)`,
    },
  },
  textarea: {
    minHeight: '80px',
    resize: 'vertical',
  },
  checkboxGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.8rem 1.5rem',
    marginBottom: '0.8rem',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.9rem',
    color: '#1a1a1a',
    cursor: 'pointer',
  },
  addRow: {
    display: 'flex',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  addButton: {
    padding: '0.4rem 1rem',
    borderRadius: '8px',
    border: `1px solid ${NAVY}`,
    backgroundColor: 'transparent',
    color: NAVY,
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    ':hover': {
      backgroundColor: 'rgba(30,42,120,0.05)',
    },
  },
  tagList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
    marginTop: '0.4rem',
  },
  tag: {
    background: '#eef2ff',
    color: NAVY,
    padding: '0.2rem 0.6rem',
    borderRadius: '999px',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  tagRemove: {
    cursor: 'pointer',
    color: '#888',
    fontWeight: 'bold',
    fontSize: '1rem',
    lineHeight: 1,
  },
  rowWithSuffix: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  suffix: {
    fontSize: '0.85rem',
    color: '#666',
  },
  hint: {
    fontSize: '0.85rem',
    color: '#666',
    margin: '0 0 0.8rem',
  },
  fileUploadRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  fileDisplay: {
    flex: 1,
    padding: '0.6rem 0.75rem',
    borderRadius: '8px',
    border: '1px solid #d7dce8',
    backgroundColor: '#fff',
    fontSize: '0.9rem',
    color: '#1a1a1a',
    minHeight: '44px',
    display: 'flex',
    alignItems: 'center',
  },
  fileName: {
    fontWeight: 500,
  },
  filePlaceholder: {
    color: '#888',
  },
  error: {
    color: '#c00',
    fontSize: '0.85rem',
    margin: 0,
  },
  success: {
    color: '#0a7c2f',
    fontSize: '0.85rem',
    margin: 0,
  },
  buttonRow: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '0.7rem 2rem',
    background: 'transparent',
    border: '1px solid #d7dce8',
    borderRadius: '9px',
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#555',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  submitButton: {
    padding: '0.7rem 2rem',
    backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff',
    border: 'none',
    borderRadius: '9px',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    ':hover': {
      opacity: 0.9,
    },
  },
};

export default RegisterCourse;