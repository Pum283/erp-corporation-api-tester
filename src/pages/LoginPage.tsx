import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HttpError } from '../api/http';
import { Alert } from '../components/ui/Alert';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@company.com');
  const [password, setPassword] = useState('!Abc123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && isAuthenticated) return <Navigate to="/" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Đăng nhập thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-hero">
        <div className="login-hero-content">
          <span className="brand-logo lg">ERP</span>
          <h1>Quản trị nhân sự & phân quyền tập trung</h1>
          <p>
            Nền tảng HRM nội bộ — quản lý nhân sự, phòng ban, vai trò, quyền hạn và thông báo realtime
            trên một giao diện thống nhất.
          </p>
          <ul className="login-hero-features">
            <li>Quản lý nhân sự & phòng ban</li>
            <li>RBAC — vai trò & quyền chi tiết</li>
            <li>Thông báo realtime qua SignalR</li>
          </ul>
        </div>
      </aside>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-theme-row">
            <ThemeToggle />
          </div>
          <div className="login-card-header">
            <h2>Đăng nhập</h2>
            <p>Nhập tài khoản để truy cập hệ thống</p>
          </div>

          {error && <Alert type="error" message={error} onClose={() => setError(null)} />}

          <form onSubmit={handleSubmit} className="login-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="admin@company.com"
              />
            </label>
            <label>
              Mật khẩu
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
              {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <p className="login-hint">Tài khoản seed: admin@company.com / !Abc123</p>
        </div>
      </div>
    </div>
  );
}
