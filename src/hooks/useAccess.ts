import { useCallback, useMemo } from 'react';
import { NAV_SECTIONS, ROUTE_PERMISSIONS, type PermissionCode } from '../config/permissions';
import { useAuth } from '../context/AuthContext';

function normalize(code: string) {
  return code.toLowerCase();
}

export function useAccess() {
  const { user } = useAuth();

  const permissionSet = useMemo(() => {
    const set = new Set<string>();
    for (const code of user?.permissions ?? []) {
      set.add(normalize(code));
    }
    return set;
  }, [user?.permissions]);

  const hasPermission = useCallback(
    (code?: PermissionCode | string | null) => {
      if (!code) return true;
      return permissionSet.has(normalize(code));
    },
    [permissionSet],
  );

  const hasAnyPermission = useCallback(
    (codes: Array<PermissionCode | string>) => codes.some((code) => permissionSet.has(normalize(code))),
    [permissionSet],
  );

  const canAccessRoute = useCallback(
    (path: string) => {
      const permission = ROUTE_PERMISSIONS[path];
      return hasPermission(permission);
    },
    [hasPermission],
  );

  const visibleNavSections = useMemo(
    () =>
      NAV_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter((item) => hasPermission(item.permission)),
      })).filter((section) => section.items.length > 0),
    [hasPermission],
  );

  const firstAccessibleRoute = useMemo(() => {
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (hasPermission(item.permission)) return item.to;
      }
    }
    return '/';
  }, [hasPermission]);

  return {
    user,
    bypassDataScope: user?.bypassDataScope === true,
    permissions: user?.permissions ?? [],
    hasPermission,
    hasAnyPermission,
    canAccessRoute,
    visibleNavSections,
    firstAccessibleRoute,
  };
}
