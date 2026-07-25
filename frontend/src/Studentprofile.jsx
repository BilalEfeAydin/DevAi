import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { NAVY, NAVY_DARK } from './Theme';
import {
  UserIcon, BookIcon, CapIcon, BellIcon,
  HelpIcon, LogOutIcon, MailIcon,
  MenuIcon, SettingsIcon
} from './Icons';

// Styles CSS pour les cartes et la sidebar
const hoverCSS = `
  .infoCard {
    transition: box-shadow 0.15s ease, transform 0.15s ease;
    cursor: default;
  }
  .infoCard.clickable {
    cursor: pointer;
  }
  .infoCard.clickable:hover {
    box-shadow: 0 8px 20px rgba(30, 42, 120, 0.18);
    transform: translateY(-2px);
  }
  .sidebarOverlay {
    transition: opacity 0.2s ease;
  }
  .sidebar {
    transition: transform 0.25s ease;
  }
`;

function StudentProfile() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const attrs = await fetchUserAttributes();
        const name = attrs.name || '';
        const family = attrs.family_name || '';
        setFirstName(name);
        setLastName(family);
        setFullName([name, family].filter(Boolean).join(' ') || 'Student');
        setEmail(attrs.email || '');
      } catch (err) {
        console.warn('Could not load profile attributes:', err);
      } finally {
        setLoadingProfile(false);
      }
    }
    loadProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      navigate('/login');
    }
  };

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  // Navigation : seulement Profile (actif), My Courses, Help
  const navItems = [
    { label: 'Profile', icon: <UserIcon />, active: true, disabled: false },
    { label: 'My Courses', icon: <BookIcon />, active: false, disabled: true },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true },
  ];

  // Statistiques (inchangées)
  const stats = [
    { label: 'Enrolled Courses', value: '3 Courses', icon: <BookIcon /> },
    { label: 'Completed Exercises', value: '42 Exercises', icon: <CapIcon /> },
    { label: 'Avg Solution Attempts', value: '1.8 Attempts', icon: <CapIcon /> },
  ];

  // Nouvelles cartes d'information
  const infoCards = [
    {
      id: 'role',
      label: 'Role',
      value: 'Student',
      icon: <UserIcon />,
      clickable: false,
    },
    {
      id: 'platform',
      label: 'Platform',
      value: 'DevAI',
      icon: <CapIcon />,
      clickable: false,
    },
    {
      id: 'notifications',
      label: 'Notifications',
      value: 'View all',
      icon: <BellIcon />,
      clickable: true,
      onClick: () => alert('Coming soon: notifications page'),
    },
  ];

  // Génération des initiales (ex: "LR")
  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last || '?';
  };

  return (
    <div style={styles.page}>
      <style>{hoverCSS}</style>

      {/* Overlay pour fermer la sidebar */}
      {sidebarOpen && (
        <div
          className="sidebarOverlay"
          style={styles.overlay}
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className="sidebar"
        style={{
          ...styles.sidebar,
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div>
          <div style={styles.sidebarBrand}>
            <span style={styles.sidebarBrandIcon}><CapIcon /></span>
            <div>
              <div style={styles.sidebarBrandTitle}>DevAI</div>
              <div style={styles.sidebarBrandSubtitle}>Student Portal</div>
            </div>
          </div>

          <nav style={styles.nav}>
            {navItems.map((item) => (
              <div
                key={item.label}
                style={item.active ? styles.navItemActive : (item.disabled ? styles.navItemDisabled : styles.navItem)}
                title={item.disabled ? 'Coming soon' : undefined}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        <button type="button" onClick={handleLogout} style={styles.logoutButton}>
          <LogOutIcon /> Log Out
        </button>
      </aside>

      {/* Contenu principal */}
      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button type="button" onClick={toggleSidebar} style={styles.hamburgerButton}>
              <MenuIcon />
            </button>
            <h1 style={styles.pageTitle}>My Profile</h1>
          </div>
          <div style={styles.headerIcons}>
            <span style={styles.headerIconButton}><BellIcon /></span>
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

        {/* Carte de profil - Alignement corrigé */}
        <div style={styles.profileCard}>
          <span style={styles.profileAvatar}>
            {loadingProfile ? '...' : getInitials()}
          </span>
          <div style={styles.profileText}>
            <h2 style={styles.profileName}>
              {loadingProfile ? 'Loading...' : fullName}
            </h2>
            <p style={styles.profileMeta}>
              <MailIcon /> <span>{loadingProfile ? '' : email}</span>
            </p>
          </div>
        </div>

        {/* Statistiques */}
        <div style={styles.statsRow}>
          {stats.map((stat) => (
            <div key={stat.label} style={styles.statCard}>
              <span style={styles.statIcon}>{stat.icon}</span>
              <div>
                <div style={styles.statLabel}>{stat.label}</div>
                <div style={styles.statValue}>{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Nouvelles cartes d'information */}
        <h3 style={styles.sectionTitle}>Information</h3>
        <div style={styles.infoGrid}>
          {infoCards.map((card) => (
            <div
              key={card.id}
              className={`infoCard ${card.clickable ? 'clickable' : ''}`}
              style={styles.infoCard}
              onClick={card.clickable ? card.onClick : undefined}
            >
              <span style={styles.infoCardIcon}>{card.icon}</span>
              <div style={styles.infoCardContent}>
                <div style={styles.infoCardLabel}>{card.label}</div>
                <div style={styles.infoCardValue}>{card.value}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

// Styles
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f5f7fb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
    zIndex: 999,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '240px',
    height: '100%',
    backgroundImage: `linear-gradient(180deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff',
    padding: '1.5rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    zIndex: 1000,
    transform: 'translateX(-100%)',
    transition: 'transform 0.25s ease',
  },
  sidebarBrand: { display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0 0.5rem 1.5rem' },
  sidebarBrandIcon: { display: 'flex' },
  sidebarBrandTitle: { fontWeight: 800, fontSize: '1.1rem' },
  sidebarBrandSubtitle: { fontSize: '0.72rem', color: '#c7cdf0' },
  nav: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.7rem',
    borderRadius: '8px', fontSize: '0.9rem', color: '#dbe0fb', cursor: 'pointer',
  },
  navItemActive: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.7rem',
    borderRadius: '8px', fontSize: '0.9rem', color: '#fff', fontWeight: 700,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  navItemDisabled: {
    display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 0.7rem',
    borderRadius: '8px', fontSize: '0.9rem', color: '#7b81ab', cursor: 'not-allowed',
  },
  navIcon: { display: 'flex' },
  logoutButton: {
    display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none',
    color: '#dbe0fb', fontSize: '0.9rem', cursor: 'pointer', padding: '0.6rem 0.7rem',
  },
  main: {
    flex: 1,
    padding: '1.5rem 2rem',
    overflowY: 'auto',
    marginLeft: 0,
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
    transition: 'background 0.2s',
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
    flexShrink: 0,
    border: `2px solid ${NAVY}`,
  },
  // Carte de profil modifiée pour aligner le texte avec le haut de l'avatar
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center', // avatar and text block centered together
    gap: '0.65rem', // tight spacing, no dead space between avatar and name
    marginBottom: '1.5rem',
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: NAVY,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem',
    fontWeight: 700,
    flexShrink: 0,
    border: `2px solid ${NAVY}`,
  },
  // Conteneur du texte -- pas de marge, aligné directement avec l'avatar
  profileText: {
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
  },
  profileName: {
    margin: 0,
    fontSize: '1.2rem',
    color: '#1a1a1a',
    lineHeight: 1.3,
  },
  profileMeta: {
    margin: '0.25rem 0 0',
    fontSize: '0.85rem',
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem', // consistent gap between mail icon and email text
  },
  statsRow: { display: 'flex', gap: '1rem', marginBottom: '2rem' },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '1.1rem',
    boxShadow: '0 4px 16px rgba(30,42,120,0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
  },
  statIcon: { color: NAVY, display: 'flex' },
  statLabel: { fontSize: '0.75rem', color: '#888' },
  statValue: { fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a' },
  sectionTitle: { fontSize: '1rem', color: '#333', marginBottom: '0.8rem' },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '1rem',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: '1px solid #e7eaf5',
    padding: '1.2rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    boxShadow: '0 2px 8px rgba(30,42,120,0.04)',
    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
  },
  infoCardIcon: {
    color: NAVY,
    display: 'flex',
    fontSize: '1.4rem',
  },
  infoCardContent: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoCardLabel: {
    fontSize: '0.75rem',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
  },
  infoCardValue: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#1a1a1a',
  },
};

export default StudentProfile;