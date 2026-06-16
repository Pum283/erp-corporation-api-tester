import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { departmentsApi, jobLevelsApi, rolesApi } from '../api/services';
import { P } from '../config/permissions';
import { useAccess } from '../hooks/useAccess';
import { loadPermissionCatalog } from '../lib/permissionCatalog';
import { useAuth } from './AuthContext';
import type { DepartmentDto, JobLevelDto, PermissionDto, RoleDto } from '../types/entities';

interface ReferenceDataContextValue {
  departments: DepartmentDto[];
  jobLevels: JobLevelDto[];
  roles: RoleDto[];
  permissions: PermissionDto[];
  loading: boolean;
  ready: boolean;
  refreshDepartments: () => Promise<void>;
  refreshJobLevels: () => Promise<void>;
  refreshRoles: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
  refreshAll: () => Promise<void>;
}

const ReferenceDataContext = createContext<ReferenceDataContextValue | null>(null);

let sharedLoadPromise: Promise<void> | null = null;

export function ReferenceDataProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const { hasAnyPermission, hasPermission } = useAccess();
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);
  const [jobLevels, setJobLevels] = useState<JobLevelDto[]>([]);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canLoadDepartments = hasAnyPermission([
    P.HRM_DEPARTMENT_READ,
    P.HRM_EMPLOYEE_CREATE,
    P.HRM_EMPLOYEE_UPDATE,
  ]);
  const canLoadJobLevels = hasAnyPermission([
    P.HRM_JOBLEVEL_READ,
    P.HRM_EMPLOYEE_CREATE,
    P.HRM_EMPLOYEE_UPDATE,
  ]);
  const canLoadRoles = hasAnyPermission([
    P.SYSTEM_ROLE_READ,
    P.SYSTEM_ROLE_ASSIGN,
    P.SYSTEM_NOTIFICATION_TRIGGER_READ,
  ]);
  const canLoadPermissions = hasAnyPermission([P.SYSTEM_PERMISSION_READ, P.SYSTEM_ROLE_READ]);
  const usePermissionsApiForCatalog = hasPermission(P.SYSTEM_PERMISSION_READ);

  const refreshDepartments = useCallback(async () => {
    if (!canLoadDepartments) {
      setDepartments([]);
      return;
    }
    setDepartments(await departmentsApi.listAll());
  }, [canLoadDepartments]);

  const refreshJobLevels = useCallback(async () => {
    if (!canLoadJobLevels) {
      setJobLevels([]);
      return;
    }
    const list = await jobLevelsApi.listAll();
    setJobLevels([...list].sort((a, b) => a.levelOrder - b.levelOrder || a.levelName.localeCompare(b.levelName)));
  }, [canLoadJobLevels]);

  const refreshRoles = useCallback(async () => {
    if (!canLoadRoles) {
      setRoles([]);
      return;
    }
    setRoles(await rolesApi.listAll());
  }, [canLoadRoles]);

  const refreshPermissions = useCallback(async () => {
    if (!canLoadPermissions) {
      setPermissions([]);
      return;
    }
    setPermissions(await loadPermissionCatalog(usePermissionsApiForCatalog));
  }, [canLoadPermissions, usePermissionsApiForCatalog]);

  const refreshAll = useCallback(async () => {
    if (!sharedLoadPromise) {
      sharedLoadPromise = (async () => {
        const tasks: Promise<void>[] = [];

        if (canLoadDepartments) {
          tasks.push(
            departmentsApi.listAll().then((value) => {
              if (mountedRef.current) setDepartments(value);
            }),
          );
        } else if (mountedRef.current) {
          setDepartments([]);
        }

        if (canLoadJobLevels) {
          tasks.push(
            jobLevelsApi.listAll().then((value) => {
              if (!mountedRef.current) return;
              setJobLevels(
                [...value].sort(
                  (a, b) => a.levelOrder - b.levelOrder || a.levelName.localeCompare(b.levelName),
                ),
              );
            }),
          );
        } else if (mountedRef.current) {
          setJobLevels([]);
        }

        if (canLoadRoles) {
          tasks.push(
            rolesApi.listAll().then((value) => {
              if (mountedRef.current) setRoles(value);
            }),
          );
        } else if (mountedRef.current) {
          setRoles([]);
        }

        if (canLoadPermissions) {
          tasks.push(
            loadPermissionCatalog(usePermissionsApiForCatalog).then((value) => {
              if (mountedRef.current) setPermissions(value);
            }),
          );
        } else if (mountedRef.current) {
          setPermissions([]);
        }

        await Promise.allSettled(tasks);
        if (mountedRef.current) setReady(true);
      })().finally(() => {
        sharedLoadPromise = null;
      });
    }

    setLoading(true);
    try {
      await sharedLoadPromise;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [canLoadDepartments, canLoadJobLevels, canLoadRoles, canLoadPermissions, usePermissionsApiForCatalog]);

  useEffect(() => {
    if (!isAuthenticated) {
      setDepartments([]);
      setJobLevels([]);
      setRoles([]);
      setPermissions([]);
      setReady(false);
      sharedLoadPromise = null;
      return;
    }
    if (authLoading || !user) return;
    refreshAll();
  }, [isAuthenticated, authLoading, user, refreshAll]);

  const value = useMemo(
    () => ({
      departments,
      jobLevels,
      roles,
      permissions,
      loading,
      ready,
      refreshDepartments,
      refreshJobLevels,
      refreshRoles,
      refreshPermissions,
      refreshAll,
    }),
    [
      departments,
      jobLevels,
      roles,
      permissions,
      loading,
      ready,
      refreshDepartments,
      refreshJobLevels,
      refreshRoles,
      refreshPermissions,
      refreshAll,
    ],
  );

  return <ReferenceDataContext.Provider value={value}>{children}</ReferenceDataContext.Provider>;
}

export function useReferenceData() {
  const ctx = useContext(ReferenceDataContext);
  if (!ctx) throw new Error('useReferenceData must be used within ReferenceDataProvider');
  return ctx;
}
