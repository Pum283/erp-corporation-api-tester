import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/', label: 'Tổng quan', icon: '◉' },
  { to: '/users', label: 'Nhân sự', icon: '👤' },
  { to: '/departments', label: 'Phòng ban', icon: '🏢' },
  { to: '/roles', label: 'Vai trò', icon: '🛡' },
  { to: '/permissions', label: 'Quyền hệ thống', icon: '🔑' },
  { to: '/job-levels', label: 'Cấp bậc', icon: '🏷' },
];

export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="erp-shell">
      <aside className="erp-sidebar">
        <div className="brand">
          <span className="brand-logo">ERP</span>
          <div>
            <strong>Corporation</strong>
            <small>HRM & RBAC</small>
          </div>
        </div>
        <nav className="erp-nav">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <small>API v2 · https://localhost:7001</small>
        </div>
      </aside>

      <div className="erp-main">
        <header className="erp-topbar">
          <div className="topbar-title">Hệ thống quản trị doanh nghiệp</div>
          <div className="topbar-user">
            <div className="user-chip">
              <span className="user-avatar">{(user?.fullName ?? '?')[0]}</span>
              <div>
                <strong>{user?.fullName}</strong>
                <small>
                  {user?.employeeCode} · {user?.roles.join(', ') || '—'}
                </small>
              </div>
            </div>
            <button type="button" className="btn btn-ghost" onClick={() => logout()}>
              Đăng xuất
            </button>
          </div>
        </header>
        <main className="erp-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
