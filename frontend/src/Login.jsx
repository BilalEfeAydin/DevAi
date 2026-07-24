import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signOut, fetchUserAttributes } from 'aws-amplify/auth';
import { styles } from './theme';
import { MailIcon, LockIcon, EyeIcon, ArrowIcon, CapIcon } from './icons';

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

      if (role === 'instructor') {
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

            {error && <p style={styles.error}>{error}</p>}

            <button type="submit" disabled={loading} style={styles.primaryButton}>
              {loading ? 'Signing in...' : (
                <>
                  Sign In <ArrowIcon />
                </>
              )}
            </button>
          </form>
        </div>

        <p style={styles.switchLine}>
          Don't have an account?{' '}
          <button type="button" onClick={() => navigate('/signup')} style={styles.linkButton}>
            Sign up here
          </button>
        </p>
      </div>
    </div>
  );
}

export default Login;