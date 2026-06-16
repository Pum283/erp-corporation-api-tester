import type { ReactNode } from 'react';
import type { PermissionCode } from '../../config/permissions';
import { useAccess } from '../../hooks/useAccess';

interface CanAccessProps {
  permission?: PermissionCode | string;
  anyOf?: Array<PermissionCode | string>;
  children: ReactNode;
  fallback?: ReactNode;
}

export function CanAccess({ permission, anyOf, children, fallback = null }: CanAccessProps) {
  const { hasPermission, hasAnyPermission } = useAccess();

  if (anyOf?.length) {
    return hasAnyPermission(anyOf) ? <>{children}</> : <>{fallback}</>;
  }

  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
