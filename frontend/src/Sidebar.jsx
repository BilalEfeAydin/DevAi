import { NAVY, NAVY_DARK } from './Theme';
import { CapIcon, LogOutIcon } from './Icons';

const hoverCSS = `
  .sidebarOverlay { transition: opacity 0.2s ease; }
  .sidebar { transition: transform 0.25s ease; }
`;

function Sidebar({ subtitle, navItems, isOpen, onClose, onLogout }) {
  return (
    <>
      <style>{hoverCSS}</style>

      {isOpen && (
        <div className="sidebarOverlay" style={styles.overlay} onClick={onClose} />
      )}

      <aside
        className="sidebar"
        style={{ ...styles.sidebar, transform: isOpen ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        <div>
          <div style={styles.sidebarBrand}>
            <span style={styles.sidebarBrandIcon}><CapIcon /></span>
            <div>
              <div style={styles.sidebarBrandTitle}>DevAI</div>
              <div style={styles.sidebarBrandSubtitle}>{subtitle}</div>
            </div>
          </div>

          <nav style={styles.nav}>
            {navItems.map((item) => (
              <div
                key={item.label}
                onClick={!item.disabled ? item.onClick : undefined}
                style={item.active ? styles.navItemActive : (item.disabled ? styles.navItemDisabled : styles.navItem)}
                title={item.disabled ? 'Coming soon' : undefined}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </nav>
        </div>

        <button type="button" onClick={onLogout} style={styles.logoutButton}>
          <LogOutIcon /> Log Out
        </button>
      </aside>
    </>
  );
}

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999,
  },
  sidebar: {
    position: 'fixed', top: 0, left: 0, width: '240px', height: '100%',
    backgroundImage: `linear-gradient(180deg, ${NAVY}, ${NAVY_DARK})`,
    color: '#fff', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column',
    justifyContent: 'space-between', zIndex: 1000, transform: 'translateX(-100%)',
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
};

export default Sidebar;
