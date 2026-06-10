export type UserStatus = 1 | 2 | 3 | 4 | 5 | 6;
export type ScopeType = 1 | 2 | 3 | 4;
export type PermissionModule = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
export type PermissionAction = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface TokenResponse {
  token: string;
  expiry: string;
  employeeCode: string;
  fullName: string;
  userId: string;
  refreshToken: string;
  refreshTokenExpiry: string;
}

export interface UserDto {
  id: string;
  employeeCode: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  departmentId: string;
  departmentName: string;
  jobLevelId: string;
  jobLevelName: string;
  managerId?: string | null;
  managerName?: string | null;
  dateOfJoin: string;
  status: UserStatus;
  isActive: boolean;
  roles: string[];
}

export interface UserDepartmentDto {
  id: string;
  userId: string;
  departmentId: string;
  departmentName: string;
  departmentCode: string;
  isPrimary: boolean;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
}

export interface DepartmentDto {
  id: string;
  departmentName: string;
  departmentCode: string;
  parentDepartmentId?: string | null;
  parentDepartmentName?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface PermissionDto {
  id: string;
  permissionCode: string;
  permissionName: string;
  module: PermissionModule;
  action: PermissionAction;
  resource: string;
  description?: string | null;
  isActive: boolean;
}

export interface RoleDto {
  id: string;
  roleName: string;
  displayName: string;
  description?: string | null;
  isSystemRole: boolean;
  bypassDataScope: boolean;
  isActive: boolean;
  permissions: PermissionDto[];
}

export interface JobLevelDto {
  id: string;
  levelName: string;
  levelOrder: number;
  defaultScopeType: ScopeType;
  description?: string | null;
  baseSalaryMin?: number | null;
  baseSalaryMax?: number | null;
  isActive: boolean;
}

export interface ApiError {
  title?: string;
  detail?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
