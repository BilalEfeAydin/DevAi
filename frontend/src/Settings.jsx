import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  fetchUserAttributes, updateUserAttributes, confirmUserAttribute,
  updatePassword, signOut,
} from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import Sidebar from './Sidebar';
import {
  UserIcon, MailIcon, LockIcon, EyeIcon, CalendarIcon,
  MenuIcon, BellIcon, HelpIcon, SettingsIcon, BookIcon, ChartIcon,
} from './Icons';

import DatePicker, { registerLocale } from 'react-datepicker';
import enUS from 'date-fns/locale/en-US';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

registerLocale('en-US', enUS);

const COLORS = {
  profile: NAVY,
  email: '#7c3aed',
  password: '#0e9f6e',
  account: '#f59e0b',
};

const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

// FIX (lesson learned from RegisterCourse.jsx): Card must be defined
// OUTSIDE the component, at module scope. Defining it inside the
// component body creates a new function reference on every re-render,
// which makes React unmount/remount the entire subtree (every input)
// on every keystroke.
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

function Settings() {
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Profile info form
  const [nameField, setNameField] = useState('');
  const [familyNameField, setFamilyNameField] = useState('');
  const [birthdate, setBirthdate] = useState(null);
  const [gender, setGender] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  // Email form
  const [currentEmail, setCurrentEmail] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [emailStep, setEmailStep] = useState('idle'); // 'idle' | 'codeSent'
  const [emailCode, setEmailCode] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  // Password form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const attrs = await fetchUserAttributes();
        setFirstName(attrs.name || '');
        setLastName(attrs.family_name || '');
        setNameField(attrs.name || '');
        setFamilyNameField(attrs.family_name || '');
        setBirthdate(attrs.birthdate ? new Date(attrs.birthdate) : null);
        setGender(attrs.gender || '');
        setCurrentEmail(attrs.email || '');
        setRole((attrs['custom:role'] || '').toLowerCase() || null);
      } catch (err) {
        console.warn('Could not load profile attributes:', err);
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
    try { await signOut(); } finally { navigate('/login'); }
  };

  const profileRoute = role === 'instructor' ? '/profile/instructor' : '/profile/student';

  const navItems = role === 'instructor'
    ? [
        { label: 'Dashboard', icon: <ChartIcon />, active: false, disabled: false, onClick: () => navigate('/instructor/dashboard') },
        { label: 'Profile', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate('/profile/instructor') },
        { label: 'Settings', icon: <SettingsIcon />, active: true, disabled: false, onClick: undefined },
        { label: 'Help', icon: <HelpIcon />, active: false, disabled: false, onClick: () => navigate('/help') },
      ]
    : [
        { label: 'Profile', icon: <UserIcon />, active: false, disabled: false, onClick: () => navigate('/profile/student') },
        { label: 'My Courses', icon: <BookIcon />, active: false, disabled: false, onClick: () => navigate('/courses') },
        { label: 'Settings', icon: <SettingsIcon />, active: true, disabled: false, onClick: undefined },
        { label: 'Help', icon: <HelpIcon />, active: false, disabled: false, onClick: () => navigate('/help') },
      ];

  // ---- Profile info save ----
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileError(''); setProfileSuccess('');

    if (!nameField.trim() || !familyNameField.trim()) {
      setProfileError('First and last name are required.');
      return;
    }
    if (!gender) {
      setProfileError('Please select a gender.');
      return;
    }

    setProfileSaving(true);
    try {
      const birthdateStr = birthdate ? format(birthdate, 'yyyy-MM-dd') : '';
      await updateUserAttributes({
        userAttributes: {
          name: nameField.trim(),
          family_name: familyNameField.trim(),
          birthdate: birthdateStr,
          gender,
        },
      });
      setFirstName(nameField.trim());
      setLastName(familyNameField.trim());
      setProfileSuccess('Profile updated successfully.');
    } catch (err) {
      setProfileError(err.message || 'Could not update profile.');
    } finally {
      setProfileSaving(false);
    }
  };

  // ---- Email change ----
  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    setEmailError(''); setEmailSuccess('');

    const trimmed = newEmail.trim();
    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    if (trimmed === currentEmail) {
      setEmailError('This is already your current email.');
      return;
    }

    setEmailSaving(true);
    try {
      const output = await updateUserAttributes({ userAttributes: { email: trimmed } });
      const nextStep = output.email?.nextStep;
      if (nextStep?.updateAttributeStep === 'CONFIRM_ATTRIBUTE_WITH_CODE') {
        setEmailStep('codeSent');
        setEmailSuccess(`A verification code was sent to ${trimmed}. Enter it below to confirm the change.`);
      } else {
        setCurrentEmail(trimmed);
        setNewEmail('');
        setEmailSuccess('Email updated successfully.');
      }
    } catch (err) {
      if (err.name === 'AliasExistsException') {
        setEmailError('This email is already in use by another account.');
      } else {
        setEmailError(err.message || 'Could not update email.');
      }
    } finally {
      setEmailSaving(false);
    }
  };

  const handleConfirmEmailCode = async (e) => {
    e.preventDefault();
    setEmailError('');

    if (!emailCode.trim()) {
      setEmailError('Enter the verification code.');
      return;
    }

    setEmailSaving(true);
    try {
      await confirmUserAttribute({ userAttributeKey: 'email', confirmationCode: emailCode.trim() });
      setCurrentEmail(newEmail.trim());
      setNewEmail('');
      setEmailCode('');
      setEmailStep('idle');
      setEmailSuccess('Email confirmed and updated successfully.');
    } catch (err) {
      if (err.name === 'CodeMismatchException') {
        setEmailError('Invalid verification code.');
      } else if (err.name === 'ExpiredCodeException') {
        setEmailError('This code has expired. Please request the change again.');
      } else {
        setEmailError(err.message || 'Could not confirm the code.');
      }
    } finally {
      setEmailSaving(false);
    }
  };

  const cancelEmailChange = () => {
    setEmailStep('idle');
    setEmailCode('');
    setNewEmail('');
    setEmailError('');
    setEmailSuccess('');
  };

  // ---- Password change ----
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError(''); setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!passwordRegex.test(newPassword)) {
      setPasswordError('New password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setPasswordSaving(true);
    try {
      await updatePassword({ oldPassword: currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordSuccess('Password changed successfully.');
    } catch (err) {
      if (err.name === 'NotAuthorizedException') {
        setPasswordError('Current password is incorrect.');
      } else if (err.name === 'InvalidPasswordException') {
        setPasswordError('New password does not meet the requirements.');
      } else if (err.name === 'LimitExceededException') {
        setPasswordError('Too many attempts. Please wait a moment and try again.');
      } else {
        setPasswordError(err.message || 'Could not change password.');
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <Sidebar
        subtitle="Account Settings"
        navItems={navItems}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onLogout={handleLogout}
      />

      <main style={styles.main}>
        <div style={styles.contentWrap}>
          <header style={styles.header}>
            <div style={styles.headerLeft}>
              <button type="button" onClick={toggleSidebar} style={styles.hamburgerButton}>
                <MenuIcon />
              </button>
              <h1 style={styles.pageTitle}>Settings</h1>
            </div>
            <div style={styles.headerIcons}>
              <span style={styles.headerIconButton}><BellIcon /></span>
              <span style={styles.avatarCircle} onClick={() => navigate(profileRoute)}>
                {loadingProfile ? '...' : getInitials()}
              </span>
            </div>
          </header>

          <p style={styles.introText}>
            Update the information you submitted when you signed up. Changes to your email require a verification code.
          </p>

          <form onSubmit={handleSaveProfile}>
            <Card title="Profile Information" icon={<UserIcon />} color={COLORS.profile}>
              <div style={styles.row2}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>First Name</label>
                  <input
                    type="text"
                    value={nameField}
                    onChange={(e) => setNameField(e.target.value)}
                    style={styles.input}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Family Name</label>
                  <input
                    type="text"
                    value={familyNameField}
                    onChange={(e) => setFamilyNameField(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.row2}>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Date of Birth</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <span style={styles.dateIcon}><CalendarIcon /></span>
                    <DatePicker
                      selected={birthdate}
                      onChange={(date) => setBirthdate(date)}
                      dateFormat="yyyy-MM-dd"
                      locale="en-US"
                      placeholderText="YYYY-MM-DD"
                      className="custom-datepicker-input"
                      popperPlacement="bottom-start"
                    />
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={styles.label}>Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    style={{ ...styles.input, color: gender ? '#1a1a1a' : '#98a0b8' }}
                  >
                    <option value="" disabled hidden>Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {profileError && <p style={styles.errorText}>{profileError}</p>}
              {profileSuccess && <p style={styles.successText}>{profileSuccess}</p>}

              <button type="submit" disabled={profileSaving} style={{ ...styles.submitButton, backgroundColor: COLORS.profile }}>
                {profileSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </Card>
          </form>

          {/* EMAIL */}
          <Card title="Email Address" icon={<MailIcon />} color={COLORS.email}>
            <p style={styles.cardHint}>Current email: <strong>{currentEmail}</strong></p>

            {emailStep === 'idle' ? (
              <form onSubmit={handleRequestEmailChange}>
                <label style={styles.label}>New Email Address</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <span style={styles.inputIcon}><MailIcon /></span>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="new@example.com"
                    style={{ ...styles.input, paddingLeft: '2.4rem' }}
                  />
                </div>

                {emailError && <p style={styles.errorText}>{emailError}</p>}
                {emailSuccess && <p style={styles.successText}>{emailSuccess}</p>}

                <button type="submit" disabled={emailSaving} style={{ ...styles.submitButton, backgroundColor: COLORS.email }}>
                  {emailSaving ? 'Sending code...' : 'Update Email'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmEmailCode}>
                <label style={styles.label}>Verification Code</label>
                <input
                  type="text"
                  value={emailCode}
                  onChange={(e) => setEmailCode(e.target.value)}
                  placeholder="123456"
                  style={styles.input}
                />

                {emailError && <p style={styles.errorText}>{emailError}</p>}
                {emailSuccess && <p style={styles.successText}>{emailSuccess}</p>}

                <div style={{ display: 'flex', gap: '0.7rem', marginTop: '1rem' }}>
                  <button type="button" onClick={cancelEmailChange} style={styles.cancelButton}>
                    Cancel
                  </button>
                  <button type="submit" disabled={emailSaving} style={{ ...styles.submitButton, backgroundColor: COLORS.email, marginTop: 0 }}>
                    {emailSaving ? 'Confirming...' : 'Confirm Code'}
                  </button>
                </div>
              </form>
            )}
          </Card>

          {/* PASSWORD */}
          <Card title="Password" icon={<LockIcon />} color={COLORS.password}>
            <form onSubmit={handleChangePassword}>
              <label style={styles.label}>Current Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showCurrentPw ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ ...styles.input, paddingLeft: '2.4rem' }}
                />
                <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} style={styles.eyeButton}>
                  <EyeIcon />
                </button>
              </div>

              <label style={styles.label}>New Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ ...styles.input, paddingLeft: '2.4rem' }}
                />
                <button type="button" onClick={() => setShowNewPw(!showNewPw)} style={styles.eyeButton}>
                  <EyeIcon />
                </button>
              </div>
              <p style={styles.passwordHint}>
                Must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.
              </p>

              <label style={styles.label}>Confirm New Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ ...styles.input, paddingLeft: '2.4rem' }}
                />
                <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={styles.eyeButton}>
                  <EyeIcon />
                </button>
              </div>

              {passwordError && <p style={styles.errorText}>{passwordError}</p>}
              {passwordSuccess && <p style={styles.successText}>{passwordSuccess}</p>}

              <button type="submit" disabled={passwordSaving} style={{ ...styles.submitButton, backgroundColor: COLORS.password }}>
                {passwordSaving ? 'Changing...' : 'Change Password'}
              </button>
            </form>
          </Card>

          {/* ACCOUNT INFO (read-only) */}
          <Card title="Account" icon={<UserIcon />} color={COLORS.account}>
            <div style={styles.accountRow}>
              <span style={styles.accountLabel}>Role</span>
              <span style={{ ...styles.roleBadge, backgroundColor: `${COLORS.account}22`, color: COLORS.account }}>
                {role === 'instructor' ? 'Instructor' : 'Student'}
              </span>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', display: 'flex', background: '#f5f7fb', fontFamily: 'system-ui, -apple-system, sans-serif' },
  // FIX: main now fills full width like every other page (no maxWidth here,
  // that was capping the whole content area and leaving dead space on the right).
  main: { flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' },
  // Inner wrapper handles the readable-width centering instead, so the
  // page background/header still spans edge-to-edge but the form content
  // stays comfortably readable and centered.
  contentWrap: { maxWidth: '820px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.2rem' },
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
  cardHeader: { marginBottom: '1rem' },
  cardHint: { fontSize: '0.85rem', color: '#555', margin: '0 0 1rem' },
  titleBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 1rem',
    borderRadius: '999px', color: '#fff', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.02em',
  },
  badgeIcon: { display: 'flex', fontSize: '1rem' },

  row2: { display: 'flex', gap: '0.8rem', marginBottom: '1rem' },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#333', marginBottom: '0.3rem', marginTop: '0.8rem' },
  input: {
    width: '100%', height: '44px', padding: '0 0.75rem', borderRadius: '8px', border: '1px solid #d7dce8',
    fontSize: '0.9rem', outline: 'none', backgroundColor: '#fff', color: '#1a1a1a', boxSizing: 'border-box',
  },
  inputIcon: { position: 'absolute', left: '0.75rem', color: '#888', display: 'flex' },
  dateIcon: { position: 'absolute', left: '0.75rem', color: '#888', display: 'flex', zIndex: 1 },
  eyeButton: { position: 'absolute', right: '0.7rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' },
  passwordHint: { fontSize: '0.75rem', color: '#666', margin: '0.3rem 0 0' },

  errorText: { color: '#c00', fontSize: '0.85rem', margin: '0.8rem 0 0' },
  successText: { color: '#0a7c2f', fontSize: '0.85rem', margin: '0.8rem 0 0' },

  submitButton: {
    marginTop: '1.2rem', padding: '0.65rem 1.6rem', color: '#fff', border: 'none',
    borderRadius: '9px', fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
  },
  cancelButton: {
    marginTop: '1.2rem', padding: '0.65rem 1.6rem', background: 'transparent', border: '1px solid #d7dce8',
    borderRadius: '9px', fontSize: '0.9rem', fontWeight: 600, color: '#555', cursor: 'pointer',
  },

  accountRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0' },
  accountLabel: { fontSize: '0.9rem', color: '#333', fontWeight: 600 },
  roleBadge: { fontSize: '0.78rem', fontWeight: 700, padding: '0.3rem 0.8rem', borderRadius: '999px', textTransform: 'capitalize' },
};

export default Settings;