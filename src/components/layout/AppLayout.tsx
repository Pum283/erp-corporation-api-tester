import { NavLink, Outlet } from 'react-router-dom';
import { NotificationBell } from '../notifications/NotificationBell';
import { IconLogout } from '../ui/Icons';
import { ThemeToggle } from '../ui/ThemeToggle';
import { useAuth } from '../../context/AuthContext';
import { useAccess } from '../../hooks/useAccess';

export function AppLayout() {
  const { user, logout } = useAuth();
  const { visibleNavSections } = useAccess();

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="brand">
          <span className="brand-logo">ERP</span>
          <div>
            <strong>Corporation</strong>
            <small>HRM & RBAC Platform</small>
          </div>
        </div>

        <nav className="erp-nav">
          {visibleNavSections.map((section) => (
            <div key={section.title} className="nav-section">
              <p className="nav-section-title">{section.title}</p>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end ?? false}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                  >
                    <span className="nav-icon">
                      <Icon width={18} height={18} />
                    </span>
                    {item.label}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <small>API v2 · {import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7001'}</small>
        </div>
      </aside>

      <div className="erp-main">
        <header className="erp-topbar">
          <div className="topbar-title">Hệ thống quản trị doanh nghiệp</div>
          <div className="topbar-user">
            <ThemeToggle />
            <NotificationBell />
            <div className="user-chip">
              <span className="user-avatar">{(user?.fullName ?? '?')[0]}</span>
              <div>
                <strong>{user?.fullName}</strong>
                <small>
                  {user?.employeeCode} · {(user?.roles ?? []).join(', ') || '—'}
                </small>
              </div>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => logout()}>
              <IconLogout width={16} height={16} />
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="erp-content page-enter">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
