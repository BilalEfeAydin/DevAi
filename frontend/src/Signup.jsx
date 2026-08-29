import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { signUp, confirmSignUp, signIn, signOut, fetchUserAttributes, resendSignUpCode } from 'aws-amplify/auth';
import { styles } from './Theme';
import { MailIcon, LockIcon, EyeIcon, UserIcon, BookIcon, ArrowIcon, CapIcon, CalendarIcon } from './Icons';

// Import du DatePicker moderne
import DatePicker from 'react-datepicker';
import { registerLocale } from 'react-datepicker';
import enUS from 'date-fns/locale/en-US';
import { format } from 'date-fns';
import 'react-datepicker/dist/react-datepicker.css';

// Enregistrement de la locale anglaise
registerLocale('en-US', enUS);

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState('signup');

  const [fullName, setFullName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthdate, setBirthdate] = useState(null);
  const [gender, setGender] = useState('');
  const [role, setRole] = useState('student');
  const [code, setCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // pour l'affichage conditionnel de la règle du mot de passe
  const [passwordHovered, setPasswordHovered] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
  const isPasswordValid = passwordRegex.test(password);
  // Affiché soit au survol, soit dès que l'utilisateur a quitté le champ
  // avec un mot de passe invalide (rouge dans ce cas).
  const showPasswordHint = passwordHovered || (passwordTouched && password.length > 0 && !isPasswordValid);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!gender) {
      setError('Please select a gender.');
      return;
    }

    if (!isPasswordValid) {
      setPasswordTouched(true);
      setError('Password does not meet the requirements above.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const birthdateStr = birthdate ? format(birthdate, 'yyyy-MM-dd') : '';

    setLoading(true);
    try {
      await signUp({
        username: email,
        password: password,
        options: {
          userAttributes: {
            email: email,
            name: fullName,
            family_name: familyName,
            birthdate: birthdateStr,
            gender: gender,
            'custom:role': role,
          },
        },
      });

      setSuccessMessage('Account created. Check your inbox for the verification code.');
      setStep('confirm');
    } catch (err) {
      // NEW: if the account already exists but was never confirmed (e.g. the
      // user refreshed the page mid-flow, losing React state, then tried to
      // sign up again with the same email), Cognito rejects the new signUp
      // with UsernameExistsException. Instead of showing a dead-end error,
      // send a fresh code and drop them straight into the confirm step --
      // confirmSignUp() only needs username + code, so this works even
      // though we didn't just create the account in this render.
      if (err.name === 'UsernameExistsException') {
        try {
          await resendSignUpCode({ username: email });
          setSuccessMessage('This account already exists but was never verified. A new code has been sent to your inbox.');
          setStep('confirm');
        } catch (resendErr) {
          if (resendErr.name === 'InvalidParameterException') {
            // Cognito throws this when the account is ALREADY confirmed --
            // meaning this really is a duplicate signup, not a stuck one.
            setError('An account with this email already exists. Please log in instead.');
          } else {
            setError(resendErr.message || 'Could not resend the verification code. Please try logging in.');
          }
        }
      } else {
        setError(err.message || 'An error occurred during sign up.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // STEP 1: confirm the account with the code the user typed in.
    // This MUST happen before any signIn attempt -- Cognito refuses to
    // sign in an unconfirmed user (UserNotConfirmedException), which is
    // exactly the bug we hit when this call went missing.
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
    } catch (err) {
      setError(err.message || 'Invalid or expired code.');
      setLoading(false);
      return;
    }

    // STEP 2: confirmation succeeded -- from here on, any failure is a
    // signIn problem, NOT a bad code. Handled separately so the error
    // message stays accurate.
    try {
      try {
        await signOut();
      } catch (signOutErr) {
        // ignore -- nobody was signed in, that's fine
      }

      const { isSignedIn } = await signIn({ username: email, password });

      if (!isSignedIn) {
        setSuccessMessage('Account verified! Please log in.');
        setTimeout(() => navigate('/login'), 1200);
        return;
      }

      let resolvedRole = role;
      try {
        const attributes = await fetchUserAttributes();
        resolvedRole = attributes['custom:role'] || role;
      } catch (attrErr) {
        console.warn('Could not fetch user attributes:', attrErr);
      }

      // NEW: preserve the invite token through signup, same logic as Login.jsx
      const inviteToken = location.state?.inviteToken;
      setSuccessMessage('Account verified successfully! Redirecting...');
      setTimeout(() => {
        if (inviteToken) {
          navigate(`/invite?token=${inviteToken}`);
        } else {
          navigate(resolvedRole === 'instructor' ? '/profile/instructor' : '/profile/student');
        }
      }, 800);
    } catch (signInErr) {
      // NEW: this covers the case where `password` in state doesn't match
      // what's actually on the account -- e.g. the user refreshed mid-flow,
      // lost state, came back through the UsernameExistsException recovery
      // path, and typed a different password the second time. The account
      // IS verified at this point (confirmed === true), just not signed in.
      console.warn('Account confirmed but auto sign-in failed:', signInErr);
      setSuccessMessage('Account verified! Please log in.');
      setTimeout(() => navigate('/login'), 1200);
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
          {step === 'signup' && (
            <>
              <form onSubmit={handleSignup}>
                <div style={styles.row2}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>First Name</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}><UserIcon /></span>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        placeholder="Enter first name"
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Family Name</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}><UserIcon /></span>
                      <input
                        type="text"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        required
                        placeholder="Enter last name"
                        style={styles.input}
                      />
                    </div>
                  </div>
                </div>

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
                <div
                  style={styles.inputWrap}
                  onMouseEnter={() => setPasswordHovered(true)}
                  onMouseLeave={() => setPasswordHovered(false)}
                >
                  <span style={styles.inputIcon}><LockIcon /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setPasswordTouched(true)}
                    required
                    placeholder="Create a secure password"
                    style={{
                      ...styles.input,
                      border: passwordTouched && password.length > 0 && !isPasswordValid
                        ? '1px solid #c00'
                        : styles.input.border,
                    }}
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
                {showPasswordHint && (
                  <p
                    style={{
                      ...styles.passwordHint,
                      color: passwordTouched && password.length > 0 && !isPasswordValid ? '#c00' : '#666',
                    }}
                  >
                    Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.
                  </p>
                )}

                <label style={styles.label}>Confirm Password</label>
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><LockIcon /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm your password"
                    style={styles.input}
                  />
                </div>

                <div style={styles.row2}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Date of Birth</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}><CalendarIcon /></span>
                      {/* Nouveau DatePicker moderne et en anglais */}
                      <DatePicker
                        selected={birthdate}
                        onChange={(date) => setBirthdate(date)}
                        dateFormat="yyyy-MM-dd"
                        locale="en-US"
                        placeholderText="YYYY-MM-DD"
                        style={{ ...styles.input, paddingLeft: '2.4rem' }}
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
                      required
                      style={{
                        ...styles.select,
                        color: gender ? '#1a1a1a' : '#98a0b8',
                      }}
                    >
                      <option value="" disabled hidden>Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <label style={styles.label}>I am joining as a...</label>
                <div style={styles.roleRow}>
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    style={role === 'student' ? styles.roleCardActive : styles.roleCard}
                  >
                    <UserIcon />
                    <span style={{ marginTop: 6 }}>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('instructor')}
                    style={role === 'instructor' ? styles.roleCardActive : styles.roleCard}
                  >
                    <BookIcon />
                    <span style={{ marginTop: 6 }}>Instructor</span>
                  </button>
                </div>

                {error && <p style={styles.error}>{error}</p>}

                <button type="submit" disabled={loading} style={styles.primaryButton}>
                  {loading ? 'Creating account...' : (
                    <>
                      Create Account <ArrowIcon />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {step === 'confirm' && (
            <form onSubmit={handleConfirm}>
              <h2 style={{ ...styles.tagline, color: '#1e2a5e', fontWeight: 700, fontSize: '1.1rem' }}>
                Check your email
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
                A code was sent to <strong>{email}</strong>
              </p>

              <label style={styles.label}>Verification Code</label>
              <div style={styles.inputWrap}>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  placeholder="123456"
                  style={{ ...styles.input, paddingLeft: '1rem' }}
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}
              {successMessage && <p style={styles.success}>{successMessage}</p>}

              <button type="submit" disabled={loading} style={styles.primaryButton}>
                {loading ? 'Verifying...' : 'Confirm'}
              </button>
            </form>
          )}
        </div>

        {step === 'signup' && (
          <p style={styles.switchLine}>
            Already have an account?{' '}
            <button type="button" onClick={() => navigate('/login')} style={styles.linkButton}>
              Log in here
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

export default Signup;