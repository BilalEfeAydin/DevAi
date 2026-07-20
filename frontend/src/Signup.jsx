import { useState } from 'react';
import { signUp, confirmSignUp } from 'aws-amplify/auth';

// --- Icônes SVG inline (pas de dépendance externe à installer) ---
const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 6-10 7L2 6" />
  </svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);
const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
  </svg>
);
const BookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2V4Z" />
    <path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7V4Z" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const CapIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3 1 8l11 5 9-4.09V17h2V8L12 3Z" />
    <path d="M5 10.5V15c0 1.66 3.13 3 7 3s7-1.34 7-3v-4.5l-7 3.18-7-3.18Z" />
  </svg>
);
const CalendarIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

function Signup({ onSwitchToLogin }) {
  const [step, setStep] = useState('signup'); // 'signup' | 'confirm'

  const [fullName, setFullName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthdate, setBirthdate] = useState('');
  const [gender, setGender] = useState('');
  const [role, setRole] = useState('student'); // 'student' | 'instructor'
  const [code, setCode] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');

    if (!gender) {
      setError('Veuillez sélectionner un genre.');
      return;
    }

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
            birthdate: birthdate, // format YYYY-MM-DD, fourni nativement par <input type="date">
            gender: gender,
          },
        },
      });

      // NOTE: le rôle (role) n'est toujours pas envoyé à Cognito — ce n'est pas
      // un attribut standard Cognito. Il faudra soit un attribut custom
      // (ex: custom:role), soit un appel séparé vers DynamoDB une fois le
      // backend prêt à recevoir cette info.

      setSuccessMessage('Compte créé. Vérifiez votre boîte mail pour le code.');
      setStep('confirm');
    } catch (err) {
      setError(err.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setSuccessMessage('Compte vérifié avec succès ! Vous pouvez maintenant vous connecter.');
    } catch (err) {
      setError(err.message || 'Code invalide ou expiré.');
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
              <div style={styles.tabs}>
                <button type="button" onClick={onSwitchToLogin} style={styles.tabInactive}>
                  Sign In
                </button>
                <button type="button" style={styles.tabActive}>
                  Sign Up
                </button>
              </div>

              <form onSubmit={handleSignup}>
                <div style={styles.row2}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Full Name</label>
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
                <div style={styles.inputWrap}>
                  <span style={styles.inputIcon}><LockIcon /></span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Create a secure password"
                    style={styles.input}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    aria-label="Afficher/masquer le mot de passe"
                  >
                    <EyeIcon />
                  </button>
                </div>

                <div style={styles.row2}>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Date of Birth</label>
                    <div style={styles.inputWrap}>
                      <span style={styles.inputIcon}><CalendarIcon /></span>
                      <input
                        type="date"
                        value={birthdate}
                        onChange={(e) => setBirthdate(e.target.value)}
                        required
                        style={styles.input}
                      />
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={styles.label}>Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      required
                      style={styles.select}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
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
                  {loading ? 'Création en cours...' : (
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
                Vérifiez votre email
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#555', marginBottom: '1rem' }}>
                Un code a été envoyé à <strong>{email}</strong>
              </p>

              <label style={styles.label}>Code de vérification</label>
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
                {loading ? 'Vérification...' : 'Confirmer'}
              </button>
            </form>
          )}
        </div>

        {step === 'signup' && (
          <p style={styles.switchLine}>
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} style={styles.linkButton}>
              Log in here
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

const NAVY = '#1e2a78';
const NAVY_DARK = '#141d54';

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(135deg, #eef2ff 0%, #f5f9ff 50%, #e8f6ff 100%)',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 1rem',
  },
  header: { textAlign: 'center', marginBottom: '1.5rem' },
  logoRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' },
  capIcon: { color: NAVY, display: 'flex' },
  brand: { color: NAVY, fontSize: '2rem', fontWeight: 800, margin: 0 },
  tagline: { color: '#555', fontSize: '0.95rem', maxWidth: 360, margin: '0.4rem auto 0' },
  card: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 8px 24px rgba(30,42,120,0.10)',
    padding: '1.75rem',
    width: '420px',
  },
  tabs: {
    display: 'flex',
    backgroundColor: '#eef1fb',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '1.4rem',
  },
  tabInactive: {
    flex: 1, padding: '0.5rem', border: 'none', background: 'transparent',
    color: '#555', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem',
  },
  tabActive: {
    flex: 1, padding: '0.5rem', border: 'none', backgroundColor: '#fff',
    color: NAVY, fontWeight: 700, borderRadius: '8px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer', fontSize: '0.9rem',
  },
  row2: { display: 'flex', gap: '0.8rem' },
  label: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#333', marginTop: '1rem', marginBottom: '0.3rem' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '0.75rem', color: '#888', display: 'flex' },
  input: {
    width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.4rem', borderRadius: '8px',
    border: '1px solid #d7dce8', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none',
    backgroundColor: '#fff', color: '#1a1a1a', colorScheme: 'light',
  },
  select: {
    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
    border: '1px solid #d7dce8', fontSize: '0.9rem', boxSizing: 'border-box',
    backgroundColor: '#fff', color: '#1a1a1a', colorScheme: 'light',
  },
  eyeButton: { position: 'absolute', right: '0.7rem', background: 'none', border: 'none', color: '#888', cursor: 'pointer', display: 'flex' },
  roleRow: { display: 'flex', gap: '0.7rem', marginTop: '0.4rem' },
  roleCard: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0.8rem 0', borderRadius: '10px', border: '1px solid #d7dce8',
    backgroundColor: '#fff', color: '#555', cursor: 'pointer', fontSize: '0.85rem',
  },
  roleCardActive: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0.8rem 0', borderRadius: '10px', border: `1px solid ${NAVY}`,
    backgroundColor: NAVY, color: '#fff', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
  },
  primaryButton: {
    width: '100%', marginTop: '1.4rem', padding: '0.7rem',
    backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', border: 'none', borderRadius: '9px', fontSize: '0.95rem',
    fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: '0.4rem',
  },
  switchLine: { textAlign: 'center', marginTop: '1.2rem', fontSize: '0.9rem', color: '#444' },
  linkButton: { background: 'none', border: 'none', color: NAVY, fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: '0.9rem' },
  error: { color: '#c00', fontSize: '0.85rem', marginTop: '0.6rem' },
  success: { color: '#0a7c2f', fontSize: '0.85rem', marginTop: '0.6rem' },
};

export default Signup;