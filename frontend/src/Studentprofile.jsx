import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, signOut } from 'aws-amplify/auth';
import { NAVY } from './theme';
import Sidebar from './Sidebar';
import {
  UserIcon, BookIcon, CapIcon, BellIcon,
  HelpIcon, MailIcon,
  MenuIcon, SettingsIcon
} from './icons';

// Styles CSS pour les cartes (le sidebar a son propre CSS dans Sidebar.jsx)
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

  // Navigation : Profile (actif), My Courses (lie vers /courses), Help
  const navItems = [
    { label: 'Profile', icon: <UserIcon />, active: true, disabled: false, onClick: undefined },
    { label: 'My Courses', icon: <BookIcon />, active: false, disabled: false, onClick: () => navigate('/courses') },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];

  // Statistiques (inchangées)
  const stats = [
    { label: 'Enrolled Courses', value: '3 Courses', icon: <BookIcon /> },
    { label: 'Completed Exercises', value: '42 Exercises', icon: <CapIcon /> },
    { label: 'Avg Solution Attempts', value: '1.8 Attempts', icon: <CapIcon /> },
  ];

  // Cartes d'information
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

      <Sidebar
        subtitle="Student Portal"
        navItems={navItems}
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        onLogout={handleLogout}
      />

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

        {/* Carte de profil */}
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

        {/* Cartes d'information */}
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

// Styles (sidebar retiré -- vit maintenant dans Sidebar.jsx)
const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    background: '#f5f7fb',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    position: 'relative',
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
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: '14px',
    boxShadow: '0 4px 16px rgba(30,42,120,0.08)',
    padding: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
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
    gap: '0.35rem',
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