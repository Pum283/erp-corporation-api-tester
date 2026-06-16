import { Navigate } from 'react-router-dom';
import type { PermissionCode } from '../../config/permissions';
import { useAccess } from '../../hooks/useAccess';
import { useAuth } from '../../context/AuthContext';
import { ForbiddenPage } from '../../pages/ForbiddenPage';

interface PermissionRouteProps {
  permission?: PermissionCode;
  children: React.ReactNode;
}

export function PermissionRoute({ permission, children }: PermissionRouteProps) {
  const { loading } = useAuth();
  const { hasPermission } = useAccess();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Đang tải...</p>
      </div>
    );
  }

  if (permission && !hasPermission(permission)) {
    return <ForbiddenPage />;
  }

  return <>{children}</>;
}

/** Chuyển hướng nếu không có quyền truy cập route mặc định */
export function DefaultRouteRedirect() {
  const { firstAccessibleRoute } = useAccess();
  return <Navigate to={firstAccessibleRoute} replace />;
}
