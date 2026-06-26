import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { 
  LayoutDashboard, 
  List, 
  AlertTriangle, 
  Users, 
  Settings, 
  Download,
  Calendar,
  User as UserIcon,
  LogOut,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import styles from './AppLayout.module.css';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/eod-logs', label: 'EOD Logs', icon: List },
  { to: '/admin/defaulters', label: 'Defaulters', icon: AlertTriangle },
  { to: '/admin/employees', label: 'Employees', icon: Users },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const employeeLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Calendar', icon: Calendar },
  { to: '/profile', label: 'Profile', icon: UserIcon },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function AppLayout() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const links = profile?.role === 'admin' ? adminLinks : employeeLinks;

  const getPageTitle = (pathname: string) => {
    if (pathname.includes('/admin/dashboard')) return 'Dashboard Overview';
    if (pathname.includes('/admin/eod-logs')) return 'EOD Logs';
    if (pathname.includes('/admin/defaulters')) return "Yesterday's Defaulters";
    if (pathname.includes('/admin/employees')) return 'Employees';
    if (pathname.includes('/admin/settings')) return 'System Settings';
    if (pathname.includes('/calendar')) return 'Calendar History';
    if (pathname.includes('/profile')) return 'My Profile';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.includes('/dashboard')) return 'Dashboard Overview';
    return 'EOD Tracker';
  };

  const pageTitle = getPageTitle(location.pathname);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <div className={styles.layout}>
      {/* Mobile Top Header */}
      <div className={styles.mobileHeader}>
        <div className={styles.brand}>EOD Tracker</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={toggleTheme} className={styles.mobileHeaderBtn}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={handleSignOut} className={styles.mobileHeaderBtn}>
            <LogOut size={20} />
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarTop}>
          <div className={styles.sidebarHeader}>
            <div className={styles.brand}>EOD Tracker</div>
            <button className={styles.collapseBtn} onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}>
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
        </div>

        <nav className={styles.nav}>
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink 
                key={link.to} 
                to={link.to} 
                className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
                title={isCollapsed ? link.label : undefined}
              >
                <Icon size={20} />
                <span>{link.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo} style={{ padding: 0, marginBottom: '0.25rem', fontWeight: 600, color: 'var(--text-primary)' }} title={`${profile?.full_name} (${profile?.employee_id})`}>
            {profile?.full_name} ({profile?.employee_id})
          </div>
          <button onClick={toggleTheme} className={styles.footerButton} title={isCollapsed ? (theme === 'light' ? 'Dark Mode' : 'Light Mode') : undefined}>
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
          <button onClick={handleSignOut} className={styles.footerButton} title={isCollapsed ? 'Logout' : undefined}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainArea}>
        <div className={styles.pageHeader}>
          <h1 className={styles.headerTitle}>{pageTitle}</h1>
        </div>
        <div className={styles.contentScroll}>
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className={styles.mobileNav}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink 
              key={link.to} 
              to={link.to} 
              className={({ isActive }) => `${styles.mobileNavItem} ${isActive ? styles.active : ''}`}
            >
              <Icon size={24} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
