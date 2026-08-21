import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  BookIcon, CapIcon, BellIcon, HelpIcon, MailIcon,
  MenuIcon, SettingsIcon, UserIcon, ChartIcon,
} from './Icons';
import { submitSupportRequest } from './MockSupport';

// ============================================================
// DOCUMENTATION CONTENT
// ============================================================
// Plain content arrays -- easy to edit without touching layout code.
// Keep these in sync with what's ACTUALLY built. Don't document
// Sprint 6 features (analytics, per-exercise config) here yet.

const platformBasics = [
  {
    q: 'What is DevAI?',
    a: "DevAI is a Socratic code review platform. Instead of giving you the fix directly, the AI reviewer asks guiding questions so you find the issue yourself. This is meant to help you actually learn, and to make it harder to pass off copy-pasted or AI-generated code as your own work.",
  },
  {
    q: 'How does the AI review get stricter or gentler?',
    a: "The hint level depends on how many times you've submitted the same exercise. Early attempts (1-2) get very abstract, broad questions. Middle attempts (3-4) point you to the general area of the problem. After attempt 5, the AI can reference specific line numbers and describe the issue directly -- but it still won't write the fix for you.",
  },
  {
    q: 'Is my code checked against an Honor Code?',
    a: "Yes. Every submission is checked against the course's Honor Code (set by your instructor). If something looks like a violation -- for example, no comments explaining your reasoning, or suspiciously perfect/copy-pasted patterns -- it will be flagged as a violation rather than just a code issue.",
  },
];

const studentFeatures = [
  {
    q: 'How do I join a course?',
    a: "Your instructor sends you an invitation, either by email or a shareable link. Open it, log in (or sign up if you're new), and accept. Once accepted, the course appears on your Course Picker page.",
  },
  {
    q: 'Where do I see what a course expects from me?',
    a: "Open the course from your Course list, then check the Course tab. You'll see the description, the notions you're expected to learn, the general rules, and tips to succeed -- all set by your instructor.",
  },
  {
    q: 'How do submissions and attempts work?',
    a: "Each exercise has a maximum number of attempts, set by your instructor. \"Run Tests\" executes your code without using up an attempt or triggering AI review. \"Run & Submit\" uses one attempt, runs your code, and sends it for AI Socratic review. You can revisit any past attempt from the attempt tabs above the editor.",
  },
  {
    q: 'What do the notification bell alerts mean?',
    a: "You'll get a notification when you're invited to a course, and when your instructor opens a new exercise in a course you're already enrolled in. Click the bell to accept/decline invitations or jump straight to a new exercise.",
  },
];

const instructorFeatures = [
  {
    q: 'How do I create a course?',
    a: "From your Profile, click \"Register New Course.\" Fill in the title/description, then configure the code rules you want enforced: naming conventions, function length and nesting limits, forbidden practices, and required patterns (like docstrings or unit tests). These rules feed directly into how the AI reviews student submissions.",
  },
  {
    q: 'How do I set the Honor Code for a course?',
    a: "In Register Course, upload a .txt file under \"Document Integration.\" The AI reviewer uses this as the source of truth for honor code violations for that specific course. If you don't upload one, a default fallback honor code is used.",
  },
  {
    q: 'How do I invite students?',
    a: "From your course overview, go to the Students tab. You can either send an invite to a specific email, or generate a shareable link anyone can use to join. You'll see the status of every invitation (pending / accepted / declined) in the table below.",
  },
  {
    q: 'How do I add exercises to a course?',
    a: "From your course overview, go to the Exercises tab and click \"Create Exercise.\" Set the title, description, badge/category, max attempts, and starter code. Every student already accepted into the course gets notified automatically.",
  },
  {
    q: "What does the Dashboard show me?",
    a: "Your Dashboard gives you a quick overview across all your courses: total courses, total students, weekly submission activity, and a \"Needs Attention\" list of recent submissions flagged as honor code violations or needing review.",
  },
];

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

// ============================================================
// ACCORDION SECTION
// ============================================================
function FaqSection({ title, color, items, openId, onToggle }) {
  return (
    <section style={styles.card}>
      <h2 style={{ ...styles.cardTitle, color }}>{title}</h2>
      <div style={styles.accordionList}>
        {items.map((item, idx) => {
          const id = `${title}-${idx}`;
          const isOpen = openId === id;
          return (
            <div key={id} style={styles.accordionItem}>
              <button
                type="button"
                onClick={() => onToggle(isOpen ? null : id)}
                style={styles.accordionQuestion}
              >
                <span>{item.q}</span>
                <span style={{ ...styles.accordionChevron, transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                  ›
                </span>
              </button>
              {isOpen && <p style={styles.accordionAnswer}>{item.a}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Help() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState(null); // 'student' | 'instructor' | null
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [openId, setOpenId] = useState(null);

  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [formError, setFormError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const attrs = await fetchUserAttributes();
        setFirstName(attrs.name || '');
        setLastName(attrs.family_name || '');
        setRole((attrs['custom:role'] || '').toLowerCase() || null);
        setForm((prev) => ({ ...prev, name: [attrs.name, attrs.family_name].filter(Boolean).join(' '), email: attrs.email || '' }));
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

  const profileRoute = role === 'instructor' ? '/profile/instructor' : '/profile/student';

  const navItems = role === 'instructor'
    ? [
        { label: 'Dashboard', icon: <ChartIcon />, active: false, disabled: false, onClick: () => navigate('/instructor/dashboard') },
        { label: 'Profile', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate('/profile/instructor') },
        { label: 'Help', icon: <HelpIcon />, active: true, disabled: false, onClick: undefined },
      ]
    : [
        { label: 'Profile', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate('/profile/student') },
        { label: 'My Courses', icon: <BookIcon />, active: false, disabled: false, onClick: () => navigate('/courses') },
        { label: 'Help', icon: <HelpIcon />, active: true, disabled: false, onClick: undefined },
      ];

  const handleFormChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setFormError('');
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Please enter your name.');
      return;
    }
    if (!isValidEmail(form.email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (form.message.trim().length < 10) {
      setFormError('Please describe your problem in a bit more detail (10+ characters).');
      return;
    }

    setSending(true);
    try {
      // NOTE (flagged deliberately): mock submission, see MockSupport.js
      submitSupportRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
        role,
      });
      setSubmitted(true);
      setForm((prev) => ({ ...prev, message: '' }));
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.page}>
      <Sidebar
        subtitle="Help & Documentation"
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
            <h1 style={styles.pageTitle}>Help & Documentation</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle} onClick={() => navigate(profileRoute)}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        <p style={styles.introText}>
          {role === 'instructor'
            ? 'Documentation for managing your courses, exercises, and students on DevAI.'
            : 'Documentation for finding courses, submitting exercises, and understanding your AI feedback on DevAI.'}
        </p>

        <FaqSection
          title="Platform Basics"
          color={NAVY}
          items={platformBasics}
          openId={openId}
          onToggle={setOpenId}
        />

        {role === 'student' && (
          <FaqSection
            title="Student Features"
            color="#0e9f6e"
            items={studentFeatures}
            openId={openId}
            onToggle={setOpenId}
          />
        )}

        {role === 'instructor' && (
          <FaqSection
            title="Instructor Features"
            color="#7c3aed"
            items={instructorFeatures}
            openId={openId}
            onToggle={setOpenId}
          />
        )}

        {/* CONTACT / SUPPORT FORM */}
        <section style={styles.card}>
          <h2 style={{ ...styles.cardTitle, color: NAVY }}>Still stuck? Report a problem</h2>
          <p style={styles.cardSubtitle}>
            Didn't find what you needed above? Send us a message and we'll follow up by email.
          </p>

          {submitted ? (
            <div style={styles.successBox}>
              <p style={{ margin: 0, fontWeight: 600, color: '#0a7c2f' }}>✅ Message sent</p>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: '#4a5568' }}>
                Thanks : we'll get back to you at {form.email}.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                style={{ ...styles.linkButton, marginTop: '0.6rem' }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitForm} style={styles.form}>
              <div style={styles.formRow}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={handleFormChange('name')}
                    placeholder="Your name"
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Email</label>
                  <div style={styles.inputIconWrap}>
                    <span style={styles.inputIcon}><MailIcon /></span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={handleFormChange('email')}
                      placeholder="you@example.com"
                      style={{ ...styles.input, paddingLeft: '2.4rem' }}
                    />
                  </div>
                </div>
              </div>

              <label style={styles.label}>What's the problem?</label>
              <textarea
                value={form.message}
                onChange={handleFormChange('message')}
                placeholder="Describe what happened, what you expected, and any error messages you saw..."
                style={{ ...styles.input, ...styles.textarea }}
              />

              {formError && <p style={styles.errorText}>{formError}</p>}

              <button type="submit" disabled={sending} style={styles.submitButton}>
                {sending ? 'Sending...' : 'Submit'}
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', background: '#f5f7fb', fontFamily: 'system-ui, -apple-system, sans-serif' },
  main: { flex: 1, padding: '1.5rem 2rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  hamburgerButton: { background: 'none', border: 'none', color: NAVY, cursor: 'pointer', display: 'flex', padding: '0.2rem', borderRadius: '6px' },
  pageTitle: { color: '#1a1a1a', fontSize: '1.4rem', fontWeight: 800, margin: 0 },
  headerIcons: { display: 'flex', alignItems: 'center', gap: '1rem' },
  headerIconButton: { color: '#666', display: 'flex', cursor: 'pointer' },
  avatarCircle: {
    width: 34, height: 34, borderRadius: '50%', backgroundColor: NAVY, color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem',
    fontWeight: 700, cursor: 'pointer',
  },
  introText: { color: '#666', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 },

  card: {
    backgroundColor: '#fff', borderRadius: '14px', boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem',
  },
  cardTitle: { margin: 0, fontSize: '1.1rem' },
  cardSubtitle: { fontSize: '0.85rem', color: '#666', margin: '0.4rem 0 1rem', lineHeight: 1.4 },

  accordionList: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' },
  accordionItem: { borderBottom: '1px solid #f0f1f6', paddingBottom: '0.5rem' },
  accordionQuestion: {
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'none', border: 'none', padding: '0.5rem 0', cursor: 'pointer',
    fontSize: '0.92rem', fontWeight: 600, color: '#1a1a1a', textAlign: 'left',
  },
  accordionChevron: { fontSize: '1.2rem', color: '#999', transition: 'transform 0.15s ease' },
  accordionAnswer: { fontSize: '0.87rem', color: '#555', lineHeight: 1.6, margin: '0.2rem 0 0.6rem' },

  form: { display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.4rem' },
  formRow: { display: 'flex', gap: '1rem', flexWrap: 'wrap' },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem' },
  inputIconWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '0.75rem', color: '#888', display: 'flex' },
  input: {
    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', border: '1px solid #d7dce8',
    fontSize: '0.9rem', outline: 'none', backgroundColor: '#fff', color: '#1a1a1a', boxSizing: 'border-box',
  },
  textarea: { minHeight: '100px', resize: 'vertical' },
  errorText: { color: '#c00', fontSize: '0.85rem', margin: 0 },
  successBox: {
    backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '1rem',
  },
  linkButton: { background: 'none', border: 'none', color: NAVY, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.85rem' },
  submitButton: {
    alignSelf: 'flex-start', padding: '0.65rem 1.6rem',
    backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', border: 'none', borderRadius: '9px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
};

export default Help;