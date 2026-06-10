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
import { departmentsApi, jobLevelsApi, permissionsApi, rolesApi } from '../api/services';
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
  const { isAuthenticated } = useAuth();
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

  const refreshDepartments = useCallback(async () => {
    setDepartments(await departmentsApi.listAll());
  }, []);

  const refreshJobLevels = useCallback(async () => {
    const list = await jobLevelsApi.listAll();
    setJobLevels([...list].sort((a, b) => a.levelOrder - b.levelOrder || a.levelName.localeCompare(b.levelName)));
  }, []);

  const refreshRoles = useCallback(async () => {
    setRoles(await rolesApi.listAll());
  }, []);

  const refreshPermissions = useCallback(async () => {
    setPermissions(await permissionsApi.listAll());
  }, []);

  const refreshAll = useCallback(async () => {
    if (!sharedLoadPromise) {
      sharedLoadPromise = (async () => {
        const [deptRes, levelRes, roleRes, permRes] = await Promise.allSettled([
          departmentsApi.listAll(),
          jobLevelsApi.listAll(),
          rolesApi.listAll(),
          permissionsApi.listAll(),
        ]);
        if (!mountedRef.current) return;
        if (deptRes.status === 'fulfilled') setDepartments(deptRes.value);
        if (levelRes.status === 'fulfilled') {
          setJobLevels(
            [...levelRes.value].sort((a, b) => a.levelOrder - b.levelOrder || a.levelName.localeCompare(b.levelName)),
          );
        }
        if (roleRes.status === 'fulfilled') setRoles(roleRes.value);
        if (permRes.status === 'fulfilled') setPermissions(permRes.value);
        setReady(true);
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
  }, []);

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
    refreshAll();
  }, [isAuthenticated, refreshAll]);

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
