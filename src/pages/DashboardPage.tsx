import { useEffect, useState } from 'react';
import { healthApi, usersApi } from '../api/services';
import { PageHeader } from '../components/ui/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useReferenceData } from '../context/ReferenceDataContext';

interface Stats {
  users: number;
  permissions: number;
  apiStatus: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { departments, roles, jobLevels, permissions, loading: refLoading, ready } = useReferenceData();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      try {
        const [usersPage, health] = await Promise.all([
          usersApi.list({ page: 1, pageSize: 1 }),
          healthApi.check(),
        ]);
        setStats({
          users: usersPage.totalCount,
          permissions: permissions.length,
          apiStatus: health.status,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, permissions.length]);

  const cards = [
    { label: 'Nhân sự', value: stats?.users, color: 'blue' },
    { label: 'Phòng ban', value: departments.length, color: 'green' },
    { label: 'Vai trò', value: roles.length, color: 'purple' },
    { label: 'Cấp bậc', value: jobLevels.length, color: 'amber' },
    { label: 'Quyền hệ thống', value: stats?.permissions, color: 'rose' },
  ];

  const pageLoading = refLoading || loading;

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user?.fullName ?? ''}`}
        subtitle="Tổng quan hệ thống nhân sự và phân quyền"
      />

      {pageLoading ? (
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
                <dt>Backend API</dt>
                <dd>{import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7001'}</dd>
              </dl>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
