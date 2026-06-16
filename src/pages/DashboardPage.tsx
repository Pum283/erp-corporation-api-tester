import { useEffect, useMemo, useState } from 'react';
import { healthApi, usersApi } from '../api/services';
import { PageHeader } from '../components/ui/PageHeader';
import { P } from '../config/permissions';
import { useAuth } from '../context/AuthContext';
import { useReferenceData } from '../context/ReferenceDataContext';
import { useAccess } from '../hooks/useAccess';

interface Stats {
  users?: number;
  permissions?: number;
  apiStatus: string;
}

export function DashboardPage() {
  const { user } = useAuth();
  const { hasPermission } = useAccess();
  const { departments, roles, jobLevels, permissions, loading: refLoading, ready } = useReferenceData();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const canUsers = hasPermission(P.HRM_EMPLOYEE_READ);
  const canDepartments = hasPermission(P.HRM_DEPARTMENT_READ);
  const canRoles = hasPermission(P.SYSTEM_ROLE_READ);
  const canJobLevels = hasPermission(P.HRM_JOBLEVEL_READ);
  const canPermissions = hasPermission(P.SYSTEM_PERMISSION_READ);

  useEffect(() => {
    if (!ready) return;

    (async () => {
      try {
        const [usersPage, health] = await Promise.all([
          canUsers ? usersApi.list({ page: 1, pageSize: 1 }) : Promise.resolve(null),
          healthApi.check(),
        ]);
        setStats({
          users: usersPage?.totalCount,
          permissions: canPermissions ? permissions.length : undefined,
          apiStatus: health.status,
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, permissions.length, canUsers, canPermissions]);

  const cards = useMemo(() => {
    const list: Array<{ label: string; value: number | undefined; color: string }> = [];
    if (canUsers) list.push({ label: 'Nhân sự', value: stats?.users, color: 'blue' });
    if (canDepartments) list.push({ label: 'Phòng ban', value: departments.length, color: 'green' });
    if (canRoles) list.push({ label: 'Vai trò', value: roles.length, color: 'purple' });
    if (canJobLevels) list.push({ label: 'Cấp bậc', value: jobLevels.length, color: 'amber' });
    if (canPermissions) list.push({ label: 'Quyền hệ thống', value: stats?.permissions, color: 'rose' });
    return list;
  }, [
    canUsers,
    canDepartments,
    canRoles,
    canJobLevels,
    canPermissions,
    stats,
    departments.length,
    roles.length,
    jobLevels.length,
  ]);

  const pageLoading = refLoading || loading;

  return (
    <div>
      <PageHeader
        title={`Xin chào, ${user?.fullName ?? ''}`}
        subtitle="Tổng quan hệ thống nhân sự và phân quyền"
      />

      {pageLoading ? (
        <div className="empty-state">
          <div className="spinner spinner-center" />
          Đang tải thống kê...
        </div>
      ) : (
        <>
          {cards.length > 0 ? (
            <div className="stat-grid">
              {cards.map((c) => (
                <div key={c.label} className={`stat-card stat-${c.color}`}>
                  <span className="stat-value">{c.value ?? 0}</span>
                  <span className="stat-label">{c.label}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              Bạn chưa được cấp quyền xem dữ liệu module nào. Liên hệ quản trị viên để được cấp quyền.
            </div>
          )}

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
                <dd>{(user?.roles ?? []).join(', ') || '—'}</dd>
              </dl>
            </section>
            <section className="panel">
              <h3>Quyền của bạn</h3>
              {user?.bypassDataScope ? (
                <>
                  <p className="muted">
                    Super Admin — {(user?.permissions ?? []).length} quyền hệ thống
                  </p>
                  {(user?.permissions ?? []).length > 0 && (
                    <div className="permission-tags">
                      {(user?.permissions ?? []).slice(0, 12).map((code) => (
                        <code key={code} className="perm-tag">
                          {code}
                        </code>
                      ))}
                      {(user?.permissions ?? []).length > 12 && (
                        <span className="muted">+{(user?.permissions ?? []).length - 12} quyền khác</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="muted">{(user?.permissions ?? []).length} quyền được cấp qua vai trò</p>
                  {(user?.permissions ?? []).length > 0 && (
                    <div className="permission-tags">
                      {(user?.permissions ?? []).slice(0, 12).map((code) => (
                        <code key={code} className="perm-tag">
                          {code}
                        </code>
                      ))}
                      {(user?.permissions ?? []).length > 12 && (
                        <span className="muted">+{(user?.permissions ?? []).length - 12} quyền khác</span>
                      )}
                    </div>
                  )}
                </>
              )}
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
