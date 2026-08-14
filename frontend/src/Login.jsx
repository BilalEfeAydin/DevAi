import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signIn, signOut, fetchUserAttributes, resetPassword, confirmResetPassword } from 'aws-amplify/auth';
import { styles } from './Theme';
import { MailIcon, LockIcon, EyeIcon, ArrowIcon, CapIcon } from './Icons';

const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('login'); // 'login' | 'forgotRequest' | 'forgotConfirm'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      try {
        await signOut();
      } catch (signOutErr) {
        // ignore
      }

      const { isSignedIn } = await signIn({ username: email, password });

      if (!isSignedIn) {
        setLoading(false);
        return;
      }

      let role = null;
      try {
        const attributes = await fetchUserAttributes();
        role = attributes['custom:role'] || null;
      } catch (attrErr) {
        console.warn('Could not fetch user attributes:', attrErr);
      }

      // NEW: if we arrived here from an invitation link, go back there
      // instead of the normal profile redirect, so the student sees the
      // Accept/Decline screen right after logging in.
      const inviteToken = location.state?.inviteToken;
      if (inviteToken) {
        navigate(`/invite?token=${inviteToken}`);
      } else if (role === 'instructor') {
        navigate('/profile/instructor');
      } else if (role === 'student') {
        navigate('/profile/student');
      } else {
        console.warn('No role found – defaulting to /profile/student.');
        navigate('/profile/student');
      }
    } catch (err) {
      if (err.name === 'UserNotConfirmedException') {
        setError('Your account is not verified yet. Please check your email for the confirmation code.');
      } else if (err.name === 'NotAuthorizedException') {
        setError('Incorrect email or password.');
      } else if (err.name === 'UserNotFoundException') {
        setError('No account found with this email.');
      } else {
        setError(err.message || 'An error occurred while signing in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      await resetPassword({ username: resetEmail });
      setResetSuccess('A verification code was sent to your email.');
      setStep('forgotConfirm');
    } catch (err) {
      if (err.name === 'UserNotFoundException') {
        setResetError('No account found with this email.');
      } else if (err.name === 'LimitExceededException') {
        setResetError('Too many attempts. Please wait a moment and try again.');
      } else {
        setResetError(err.message || 'Could not send the verification code.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setResetError('');

    if (!passwordRegex.test(newPassword)) {
      setResetError('Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setResetLoading(true);
    try {
      await confirmResetPassword({
        username: resetEmail,
        confirmationCode: resetCode,
        newPassword,
      });
      setResetSuccess('Password reset successfully! Please log in.');
      setTimeout(() => {
        setStep('login');
        setEmail(resetEmail);
        setPassword('');
        setResetEmail('');
        setResetCode('');
        setNewPassword('');
        setConfirmNewPassword('');
        setResetSuccess('');
      }, 1200);
    } catch (err) {
      if (err.name === 'CodeMismatchException') {
        setResetError('Invalid verification code.');
      } else if (err.name === 'ExpiredCodeException') {
        setResetError('This code has expired. Please request a new one.');
      } else {
        setResetError(err.message || 'Could not reset the password.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const backToLogin = () => {
    setStep('login');
    setResetError('');
    setResetSuccess('');
  };

  return (
    <div style={styles.page}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <div style={styles.logoRow}>
            <span style={styles.capIcon}><CapIcon /></span>
            <h1 style={styles.brand}>DevAI</h1>
          </div>
          <p style={styles.tagline}>
            Master the craft of programming through inquiry and collaborative review.
          </p>
        </div>

        <div style={styles.card}>
          {step === 'login' && (
            <form onSubmit={handleLogin}>
              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><MailIcon /></span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={styles.input}
                />
              </div>

              <label style={styles.label}>Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  style={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  aria-label="Show/hide password"
                >
                  <EyeIcon />
                </button>
              </div>

              <p style={styles.forgotLine}>
                <button
                  type="button"
                  onClick={() => { setResetEmail(email); setStep('forgotRequest'); }}
                  style={styles.linkButton}
                >
                  Forgot password?
                </button>
              </p>

              {error && <p style={styles.error}>{error}</p>}

              <button type="submit" disabled={loading} style={styles.primaryButton}>
                {loading ? 'Signing in...' : (
                  <>
                    Sign In <ArrowIcon />
                  </>
                )}
              </button>
            </form>
          )}

          {step === 'forgotRequest' && (
            <form onSubmit={handleRequestReset}>
              <h2 style={{ ...styles.tagline, color: '#1e2a5e', fontWeight: 700, fontSize: '1.1rem' }}>
                Reset your password
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
                Enter your email and we'll send you a verification code.
              </p>

              <label style={styles.label}>Email Address</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><MailIcon /></span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={styles.input}
                />
              </div>

              {resetError && <p style={styles.error}>{resetError}</p>}

              <button type="submit" disabled={resetLoading} style={styles.primaryButton}>
                {resetLoading ? 'Sending code...' : 'Send Verification Code'}
              </button>

              <p style={styles.switchLine}>
                <button type="button" onClick={backToLogin} style={styles.linkButton}>
                  Back to Login
                </button>
              </p>
            </form>
          )}

          {step === 'forgotConfirm' && (
            <form onSubmit={handleConfirmReset}>
              <h2 style={{ ...styles.tagline, color: '#1e2a5e', fontWeight: 700, fontSize: '1.1rem' }}>
                Check your email
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
                A code was sent to <strong>{resetEmail}</strong>
              </p>

              <label style={styles.label}>Verification Code</label>
              <div style={styles.inputWrap}>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  required
                  placeholder="123456"
                  style={{ ...styles.input, paddingLeft: '1rem' }}
                />
              </div>

              <label style={styles.label}>New Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="Create a new password"
                  style={styles.input}
                />
              </div>
              <p style={styles.passwordHint}>
                Must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.
              </p>

              <label style={styles.label}>Confirm New Password</label>
              <div style={styles.inputWrap}>
                <span style={styles.inputIcon}><LockIcon /></span>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  placeholder="Confirm new password"
                  style={styles.input}
                />
              </div>

              {resetError && <p style={styles.error}>{resetError}</p>}
              {resetSuccess && <p style={styles.success}>{resetSuccess}</p>}

              <button type="submit" disabled={resetLoading} style={styles.primaryButton}>
                {resetLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <p style={styles.switchLine}>
                <button type="button" onClick={backToLogin} style={styles.linkButton}>
                  Back to Login
                </button>
              </p>
            </form>
          )}
        </div>

        {step === 'login' && (
          <p style={styles.switchLine}>
            Don't have an account?{' '}
            <button type="button" onClick={() => navigate('/signup')} style={styles.linkButton}>
              Sign up here
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;