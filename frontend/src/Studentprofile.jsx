import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchUserAttributes, signOut, fetchAuthSession } from 'aws-amplify/auth';
import { NAVY } from './Theme';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import {
  UserIcon, BookIcon, CapIcon,
  HelpIcon, MailIcon,
  MenuIcon, SettingsIcon
} from './Icons';

const API_BASE_URL = 'https://lfass4s0ll.execute-api.us-east-1.amazonaws.com';

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

  // Stats réelles
  const [enrolledCoursesCount, setEnrolledCoursesCount] = useState(null);
  const [completedExercisesCount, setCompletedExercisesCount] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState('');

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Chargement du profil
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

  // Chargement des statistiques réelles
  useEffect(() => {
    async function loadStats() {
      setLoadingStats(true);
      setStatsError('');
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();
        const studentId = session.tokens?.idToken?.payload?.sub;
        if (!studentId) {
          setStatsError('Unable to identify student.');
          setLoadingStats(false);
          return;
        }

        // Récupération des cours
        const coursesRes = await fetch(
          `${API_BASE_URL}/courses?studentId=${studentId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (!coursesRes.ok) throw new Error('Failed to fetch courses.');
        const coursesData = await coursesRes.json();
        setEnrolledCoursesCount(coursesData.length || 0);

        // Récupération des soumissions
        const submissionsRes = await fetch(
          `${API_BASE_URL}/submissions?studentId=${studentId}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} }
        );
        if (!submissionsRes.ok) throw new Error('Failed to fetch submissions.');
        const submissionsData = await submissionsRes.json();

        // Compter les exercices uniques soumis (distincts par AssignmentID)
        const uniqueExercises = new Set();
        (submissionsData || []).forEach((sub) => {
          if (sub.AssignmentID) uniqueExercises.add(sub.AssignmentID);
        });
        setCompletedExercisesCount(uniqueExercises.size);
      } catch (err) {
        console.warn('Could not load stats:', err);
        setStatsError('Could not load your stats. Please refresh.');
        // On met des valeurs par défaut pour ne pas casser l'UI
        setEnrolledCoursesCount(0);
        setCompletedExercisesCount(0);
      } finally {
        setLoadingStats(false);
      }
    }
    loadStats();
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

  const navItems = [
    { label: 'Profile', icon: <UserIcon />, active: true, disabled: false, onClick: undefined },
    { label: 'My Courses', icon: <BookIcon />, active: false, disabled: false, onClick: () => navigate('/courses') },
    { label: 'Help', icon: <HelpIcon />, active: false, disabled: true, onClick: undefined },
  ];

  const getInitials = () => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last || '?';
  };

  // Construction des statistiques à afficher (seulement deux cartes)
  const stats = [
    {
      label: 'Enrolled Courses',
      value: loadingStats ? '...' : (statsError ? '—' : `${enrolledCoursesCount} Course${enrolledCoursesCount !== 1 ? 's' : ''}`),
      icon: <BookIcon />,
    },
    {
      label: 'Completed Exercises',
      value: loadingStats ? '...' : (statsError ? '—' : `${completedExercisesCount} Exercise${completedExercisesCount !== 1 ? 's' : ''}`),
      icon: <CapIcon />,
    },
  ];

  // Cartes d'information (on garde Role et Platform, on retire Notifications)
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
  ];

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

      <main style={styles.main}>
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button type="button" onClick={toggleSidebar} style={styles.hamburgerButton}>
              <MenuIcon />
            </button>
            <h1 style={styles.pageTitle}>My Profile</h1>
          </div>
          <div style={styles.headerIcons}>
            <NotificationBell />
            <span style={styles.headerIconButton}><SettingsIcon /></span>
            <span style={styles.avatarCircle}>
              {loadingProfile ? '...' : getInitials()}
            </span>
          </div>
        </header>

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

        {statsError && (
          <div style={styles.errorBanner}>{statsError}</div>
        )}

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
  errorBanner: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#991b1b',
    borderRadius: '10px',
    padding: '0.8rem 1rem',
    fontSize: '0.85rem',
    marginBottom: '1.2rem',
  },
  statsRow: {
    display: 'flex',
    gap: '1rem',
    marginBottom: '2rem',
  },
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
    gridTemplateColumns: 'repeat(2, 1fr)',
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