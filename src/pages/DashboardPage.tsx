import { useEffect, useState } from 'react';
import {
  departmentsApi,
  healthApi,
  jobLevelsApi,
  rolesApi,
  usersApi,
} from '../api/services';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';

interface Stats {
  users: number;
  departments: number;
  roles: number;
  jobLevels: number;
  permissions: number;
  apiStatus: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [users, departments, roles, jobLevels, health] = await Promise.all([
          usersApi.list(),
          departmentsApi.list(),
          rolesApi.list(),
          jobLevelsApi.list(),
          healthApi.check(),
        ]);
        const perms = await rolesApi.permissions();
        setStats({
          users: users.length,
          departments: departments.length,
          roles: roles.length,
          jobLevels: jobLevels.length,
          permissions: perms.length,
          apiStatus: health.status,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: 'Nhân sự', value: stats?.users, color: 'blue' },
    { label: 'Phòng ban', value: stats?.departments, color: 'green' },
    { label: 'Vai trò', value: stats?.roles, color: 'purple' },
    { label: 'Cấp bậc', value: stats?.jobLevels, color: 'amber' },
    { label: 'Quyền hệ thống', value: stats?.permissions, color: 'rose' },
  ];

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user?.fullName ?? ''}`}
        subtitle="Tổng quan hệ thống nhân sự và phân quyền"
      />

      {loading ? (
        <p className="muted">Đang tải thống kê...</p>
      ) : (
        <>
          <div className="stat-grid">
            {cards.map((c) => (
              <div key={c.label} className={`stat-card stat-${c.color}`}>
                <span className="stat-value">{c.value ?? 0}</span>
                <span className="stat-label">{c.label}</span>
              </div>
            ))}
          </div>

          <div className="panel-grid">
            <section className="panel">
              <h3>Thông tin phiên đăng nhập</h3>
              <dl className="detail-list">
                <dt>Mã NV</dt>
                <dd>{user?.employeeCode}</dd>
                <dt>Email</dt>
                <dd>{user?.email}</dd>
                <dt>Phòng ban</dt>
                <dd>{user?.departmentName}</dd>
                <dt>Cấp bậc</dt>
                <dd>{user?.jobLevelName}</dd>
                <dt>Vai trò</dt>
                <dd>{user?.roles.join(', ') || '—'}</dd>
              </dl>
            </section>
            <section className="panel">
              <h3>Hạ tầng</h3>
              <dl className="detail-list">
                <dt>API</dt>
                <dd>
                  <span className="status-dot ok" /> {stats?.apiStatus ?? 'unknown'}
                </dd>
                <dt>Frontend</dt>
                <dd>http://localhost:810</dd>
                <dt>Backend proxy</dt>
                <dd>/api → :7000</dd>
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
