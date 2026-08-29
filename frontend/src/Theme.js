// theme.js
export const NAVY = '#1e2a78';
export const NAVY_DARK = '#141d54';

export const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: '#ffffff',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem 0',
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
  row2: { display: 'flex', gap: '0.8rem' },
  label: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#333', marginTop: '1rem', marginBottom: '0.3rem' },
  inputWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: '0.75rem', color: '#888', display: 'flex' },

  // FIX: height explicite (44px) partagée avec `select` ci-dessous.
  // Padding vertical retiré (remplacé par la hauteur fixe) pour éviter
  // les écarts de rendu entre <input> et <select> selon le navigateur/OS.
  input: {
    width: '100%',
    height: '44px',
    padding: '0 0.75rem 0 2.4rem',
    borderRadius: '8px',
    border: '1px solid #d7dce8',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    outline: 'none',
    backgroundColor: '#fff',
    color: '#1a1a1a',
    colorScheme: 'light',
  },

  // FIX: même height que `input` (44px), `appearance: none` pour désactiver
  // le style natif du navigateur (c'est lui qui causait la différence de
  // taille), + flèche custom dessinée en SVG pour remplacer celle du navigateur.
  select: {
    width: '100%',
    height: '44px',
    padding: '0 2rem 0 0.75rem',
    borderRadius: '8px',
    border: '1px solid #d7dce8',
    fontSize: '0.9rem',
    boxSizing: 'border-box',
    backgroundColor: '#fff',
    colorScheme: 'light',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none',
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6'><path d='M0 0l5 6 5-6z' fill='%23888'/></svg>\")",
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
    cursor: 'pointer',
  },

  eyeButton: {
    position: 'absolute',
    right: '0.7rem',
    background: 'none',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    display: 'flex',
  },
  roleRow: { display: 'flex', gap: '0.7rem', marginTop: '0.4rem' },
  roleCard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.8rem 0',
    borderRadius: '10px',
    border: '1px solid #d7dce8',
    backgroundColor: '#fff',
    color: '#555',
    cursor: 'pointer',
    fontSize: '0.85rem',
  },
  roleCardActive: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '0.8rem 0',
    borderRadius: '10px',
    border: `1px solid ${NAVY}`,
    backgroundColor: NAVY,
    color: '#fff',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontWeight: 600,
  },
  primaryButton: {
    width: '100%',
    marginTop: '1.4rem',
    padding: '0.7rem',
    backgroundImage: `linear-gradient(135deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff',
    border: 'none',
    borderRadius: '9px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  switchLine: { textAlign: 'center', marginTop: '1.2rem', fontSize: '0.9rem', color: '#444' },
  linkButton: {
    background: 'none',
    border: 'none',
    color: NAVY,
    fontWeight: 600,
    cursor: 'pointer',
    padding: 0,
    fontSize: '0.9rem',
  },
  error: { color: '#c00', fontSize: '0.85rem', marginTop: '0.6rem' },
  success: { color: '#0a7c2f', fontSize: '0.85rem', marginTop: '0.6rem' },

  // Gardé pour compat, mais plus utilisé tel quel dans Signup.jsx
  // (remplacé par un rendu conditionnel avec couleur dynamique).
  passwordHint: {
    fontSize: '0.75rem',
    color: '#666',
    marginTop: '0.25rem',
    paddingLeft: '0.2rem',
  },
};