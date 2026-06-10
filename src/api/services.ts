import { fetchAllPages, paginationQuery } from './pagination';
import { http } from './http';
import type {
  DepartmentDto,
  JobLevelDto,
  PaginatedResult,
  PaginationParams,
  PermissionDto,
  RoleDto,
  TokenResponse,
  UserDepartmentDto,
  UserDto,
} from '../types/entities';
import type { ScopeType, UserStatus } from '../types/entities';

export const authApi = {
  login: (email: string, password: string) =>
    http<TokenResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
      auth: false,
    }),
  me: () => http<UserDto>('/api/auth/me'),
  refresh: (refreshToken: string) =>
    http<TokenResponse>('/api/auth/refresh', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),
  revoke: (refreshToken: string) =>
    http<void>('/api/auth/revoke', {
      method: 'POST',
      body: { refreshToken },
      auth: false,
    }),
};

export const usersApi = {
  list: (params?: PaginationParams) =>
    http<PaginatedResult<UserDto>>(`/api/users${paginationQuery(params)}`),
  listAll: () => fetchAllPages((p) => usersApi.list(p)),
  get: (id: string) => http<UserDto>(`/api/users/${id}`),
  create: (data: {
    employeeCode: string;
    fullName: string;
    email: string;
    departmentId: string;
    jobLevelId: string;
    dateOfJoin: string;
    status: UserStatus;
    managerId?: string | null;
    avatarUrl?: string | null;
    password?: string | null;
  }) => http<UserDto>('/api/users', { method: 'POST', body: data }),
  update: (id: string, data: {
    fullName: string;
    email: string;
    departmentId: string;
    jobLevelId: string;
    dateOfJoin: string;
    status: UserStatus;
    managerId?: string | null;
    avatarUrl?: string | null;
  }) => http<UserDto>(`/api/users/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => http<void>(`/api/users/${id}`, { method: 'DELETE' }),
  assignRoles: (id: string, roleIds: string[]) =>
    http<{ message: string }>(`/api/users/${id}/roles`, { method: 'POST', body: roleIds }),
  resetPassword: (id: string, newPassword: string) =>
    http<{ message: string }>(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: newPassword,
    }),
  listDepartments: (id: string) => http<UserDepartmentDto[]>(`/api/users/${id}/departments`),
  addDepartment: (
    id: string,
    data: { departmentId: string; startDate: string; endDate?: string | null },
  ) => http<UserDepartmentDto>(`/api/users/${id}/departments`, { method: 'POST', body: data }),
  removeDepartment: (id: string, departmentId: string) =>
    http<void>(`/api/users/${id}/departments/${departmentId}`, { method: 'DELETE' }),
};

export const departmentsApi = {
  list: (params?: PaginationParams) =>
    http<PaginatedResult<DepartmentDto>>(`/api/departments${paginationQuery(params)}`),
  listAll: () => fetchAllPages((p) => departmentsApi.list(p)),
  get: (id: string) => http<DepartmentDto>(`/api/departments/${id}`),
  create: (data: {
    departmentName: string;
    departmentCode: string;
    parentDepartmentId?: string | null;
    managerId?: string | null;
    description?: string | null;
  }) => http<DepartmentDto>('/api/departments', { method: 'POST', body: data }),
  update: (
    id: string,
    data: {
      departmentName: string;
      departmentCode: string;
      parentDepartmentId?: string | null;
      managerId?: string | null;
      description?: string | null;
      isActive: boolean;
    },
  ) => http<DepartmentDto>(`/api/departments/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => http<void>(`/api/departments/${id}`, { method: 'DELETE' }),
};

export const permissionsApi = {
  list: (params?: PaginationParams) =>
    http<PaginatedResult<PermissionDto>>(`/api/permissions${paginationQuery(params)}`),
  listAll: () => fetchAllPages((p) => permissionsApi.list(p)),
  get: (id: string) => http<PermissionDto>(`/api/permissions/${id}`),
  create: (data: {
    permissionCode: string;
    permissionName: string;
    module: number;
    action: number;
    resource: string;
    description?: string | null;
  }) => http<PermissionDto>('/api/permissions', { method: 'POST', body: data }),
  update: (
    id: string,
    data: {
      permissionName: string;
      description?: string | null;
      isActive: boolean;
    },
  ) => http<PermissionDto>(`/api/permissions/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => http<void>(`/api/permissions/${id}`, { method: 'DELETE' }),
};

export const rolesApi = {
  list: (params?: PaginationParams) =>
    http<PaginatedResult<RoleDto>>(`/api/roles${paginationQuery(params)}`),
  listAll: () => fetchAllPages((p) => rolesApi.list(p)),
  get: (id: string) => http<RoleDto>(`/api/roles/${id}`),
  permissions: (params?: PaginationParams) =>
    permissionsApi.list(params),
  permissionsAll: () => permissionsApi.listAll(),
  create: (data: {
    roleName: string;
    displayName: string;
    description?: string | null;
    bypassDataScope?: boolean;
  }) => http<RoleDto>('/api/roles', { method: 'POST', body: data }),
  update: (
    id: string,
    data: {
      displayName: string;
      description?: string | null;
      bypassDataScope: boolean;
      isActive: boolean;
    },
  ) => http<RoleDto>(`/api/roles/${id}`, { method: 'PUT', body: data }),
  updatePermissions: (id: string, permissionIds: string[]) =>
    http<{ message: string }>(`/api/roles/${id}/permissions`, {
      method: 'PUT',
      body: { permissionIds },
    }),
  remove: (id: string) => http<void>(`/api/roles/${id}`, { method: 'DELETE' }),
};

export const jobLevelsApi = {
  list: (params?: PaginationParams) =>
    http<PaginatedResult<JobLevelDto>>(`/api/job-levels${paginationQuery(params)}`),
  listAll: () => fetchAllPages((p) => jobLevelsApi.list(p)),
  get: (id: string) => http<JobLevelDto>(`/api/job-levels/${id}`),
  create: (data: {
    levelName: string;
    levelOrder: number;
    defaultScopeType: ScopeType;
    description?: string | null;
    baseSalaryMin?: number | null;
    baseSalaryMax?: number | null;
  }) => http<JobLevelDto>('/api/job-levels', { method: 'POST', body: data }),
  update: (
    id: string,
    data: {
      levelName: string;
      levelOrder: number;
      defaultScopeType: ScopeType;
      description?: string | null;
      baseSalaryMin?: number | null;
      baseSalaryMax?: number | null;
      isActive: boolean;
    },
  ) => http<JobLevelDto>(`/api/job-levels/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => http<void>(`/api/job-levels/${id}`, { method: 'DELETE' }),
};

export const healthApi = {
  check: () => http<{ status: string; timestamp: string }>('/api/health', { auth: false }),
};
