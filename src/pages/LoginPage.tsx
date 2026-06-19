import { FormEvent, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HttpError } from '../api/http';
import { BrandLogo } from '../components/ui/BrandLogo';
import { Alert } from '../components/ui/Alert';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin1@digifnb.com');
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
      <div className="login-hero-glow-1"></div>
      <div className="login-hero-glow-2"></div>
      <aside className="login-hero">
        <div className="login-hero-content">
          <BrandLogo variant="hero" className="hero-logo" />
          <span className="login-hero-tag">Nền tảng Quản trị Nội bộ</span>
          <h1>
            Quản trị nhân sự <br />
            <span>&amp; phân quyền tập trung</span>
          </h1>
          <p className="login-hero-desc">
            Hệ thống HRM hợp nhất cơ chế RBAC chi tiết và kênh thông báo realtime, tối ưu hóa quy trình vận hành và kiểm soát an toàn thông tin.
          </p>

          <div className="login-hero-features-new">
            <div className="feature-item">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Quản lý nhân sự &amp; sơ đồ tổ chức</h3>
                <p>Quản lý thông tin hồ sơ, phòng ban trực quan sinh động</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Phân quyền RBAC nâng cao</h3>
                <p>Kiểm soát truy cập chi tiết tới từng chức năng và API</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Kết nối Realtime thông suốt</h3>
                <p>Đồng bộ thông báo và cập nhật tức thời qua SignalR</p>
              </div>
            </div>
          </div>


        </div>
      </aside>

      <div className="login-panel">
        <div className="login-card">
          <div className="login-theme-row">
            <ThemeToggle />
          </div>
          <BrandLogo variant="hero" className="mobile-only-logo" />
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
                placeholder="admin1@digifnb.com"
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

          <p className="login-hint">Tài khoản seed: admin1@digifnb.com / !Abc123</p>
        </div>
      </div>
    </div>
  );
}
