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
  NotificationEventTypeDto,
  NotificationTriggerBindingDto,
  NotificationRecipientRulesDto,
  UserNotificationDto,
  UnreadNotificationCountDto,
  NotificationChannel,
  ConversationDto,
  MessageDto,
  MessageReactionDto,
  TaskDto,
  TaskCommentDto,
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
    http<PaginatedResult<PermissionDto>>(`/api/roles/permissions${paginationQuery(params)}`),
  permissionsAll: () => fetchAllPages((p) => rolesApi.permissions(p)),
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

export const notificationsApi = {
  list: (params?: PaginationParams & { isRead?: boolean }) => {
    const q = paginationQuery(params);
    const extra = params?.isRead !== undefined ? `${q ? '&' : '?'}isRead=${params.isRead}` : '';
    return http<PaginatedResult<UserNotificationDto>>(`/api/notifications${q}${extra}`);
  },
  unreadCount: () => http<UnreadNotificationCountDto>('/api/notifications/unread-count'),
  markRead: (id: string) =>
    http<UserNotificationDto>(`/api/notifications/${id}/read`, { method: 'PATCH' }),
  markAllRead: () => http<void>('/api/notifications/read-all', { method: 'PATCH' }),
};

export const notificationEventTypesApi = {
  list: (params?: PaginationParams) =>
    http<PaginatedResult<NotificationEventTypeDto>>(
      `/api/notification-event-types${paginationQuery(params)}`,
    ),
  listAll: () => fetchAllPages((p) => notificationEventTypesApi.list(p)),
  get: (id: string) => http<NotificationEventTypeDto>(`/api/notification-event-types/${id}`),
  create: (data: {
    eventCode: string;
    name: string;
    module: string;
    description?: string | null;
    defaultTitleTemplate: string;
    defaultBodyTemplate: string;
  }) => http<NotificationEventTypeDto>('/api/notification-event-types', { method: 'POST', body: data }),
  update: (
    id: string,
    data: {
      name: string;
      module: string;
      description?: string | null;
      defaultTitleTemplate: string;
      defaultBodyTemplate: string;
      isActive: boolean;
    },
  ) => http<NotificationEventTypeDto>(`/api/notification-event-types/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => http<void>(`/api/notification-event-types/${id}`, { method: 'DELETE' }),
  upsertTemplate: (
    eventTypeId: string,
    channel: NotificationChannel,
    data: { titleTemplate: string; bodyTemplate: string; isActive: boolean },
  ) =>
    http(`/api/notification-event-types/${eventTypeId}/templates/${channel}`, {
      method: 'PUT',
      body: data,
    }),
};

export const notificationTriggersApi = {
  list: (params?: PaginationParams & { module?: string }) => {
    const q = paginationQuery(params);
    const extra = params?.module ? `${q ? '&' : '?'}module=${encodeURIComponent(params.module)}` : '';
    return http<PaginatedResult<NotificationTriggerBindingDto>>(
      `/api/notification-triggers${q}${extra}`,
    );
  },
  listAll: () => fetchAllPages((p) => notificationTriggersApi.list(p)),
  get: (triggerKey: string) =>
    http<NotificationTriggerBindingDto>(
      `/api/notification-triggers/${encodeURIComponent(triggerKey)}`,
    ),
  updateBinding: (
    triggerKey: string,
    data: {
      eventTypeId?: string | null;
      linkUrlTemplate?: string | null;
      recipientRules?: NotificationRecipientRulesDto;
      isActive: boolean;
    },
  ) =>
    http<NotificationTriggerBindingDto>(
      `/api/notification-triggers/${encodeURIComponent(triggerKey)}`,
      { method: 'PUT', body: data },
    ),
};

export const conversationsApi = {
  list: () => http<ConversationDto[]>('/api/conversations'),
  get: (id: string) => http<ConversationDto>(`/api/conversations/${id}`),
  create: (data: {
    conversationType: string;
    title?: string | null;
    description?: string | null;
    isPrivate: boolean;
    memberIds: string[];
  }) => http<ConversationDto>('/api/conversations', { method: 'POST', body: data }),
  getOrCreateDirect: (otherUserId: string) =>
    http<ConversationDto>(`/api/conversations/direct/${otherUserId}`, { method: 'POST' }),
  mute: (id: string, isMuted: boolean) =>
    http<void>(`/api/conversations/${id}/mute`, { method: 'POST', body: isMuted }),
  archive: (id: string, isArchived: boolean) =>
    http<void>(`/api/conversations/${id}/archive`, { method: 'POST', body: isArchived }),
  addMembers: (id: string, userIds: string[]) =>
    http<void>(`/api/conversations/${id}/members`, { method: 'POST', body: userIds }),
  removeMember: (id: string, userId: string) =>
    http<void>(`/api/conversations/${id}/members/${userId}`, { method: 'DELETE' }),
};

export const messagesApi = {
  list: (conversationId: string, params?: { page?: number; pageSize?: number }) =>
    http<MessageDto[]>(
      `/api/conversations/${conversationId}/messages?page=${params?.page || 1}&pageSize=${
        params?.pageSize || 50
      }`,
    ),
  send: (
    conversationId: string,
    data: {
      content?: string | null;
      messageType: string;
      parentMessageID?: string | null;
      attachments?: any[];
    },
  ) =>
    http<MessageDto>(`/api/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: data,
    }),
  edit: (id: string, newContent: string) =>
    http<MessageDto>(`/api/messages/${id}`, {
      method: 'PUT',
      body: newContent,
    }),
  remove: (id: string) => http<void>(`/api/messages/${id}`, { method: 'DELETE' }),
  toggleReaction: (id: string, reactionType: string) =>
    http<MessageReactionDto>(`/api/messages/${id}/reactions`, {
      method: 'POST',
      body: reactionType,
    }),
  markAsRead: (conversationId: string) =>
    http<void>(`/api/conversations/${conversationId}/read`, { method: 'POST' }),
};

export const tasksApi = {
  list: (params?: PaginationParams & { search?: string; status?: string; priority?: string; assigneeId?: string }) => {
    let q = paginationQuery(params);
    if (params?.search) q += `${q ? '&' : '?'}search=${encodeURIComponent(params.search)}`;
    if (params?.status) q += `${q ? '&' : '?'}status=${encodeURIComponent(params.status)}`;
    if (params?.priority) q += `${q ? '&' : '?'}priority=${encodeURIComponent(params.priority)}`;
    if (params?.assigneeId) q += `${q ? '&' : '?'}assigneeId=${encodeURIComponent(params.assigneeId)}`;
    return http<PaginatedResult<TaskDto>>(`/api/tasks${q}`);
  },
  get: (id: string) => http<TaskDto>(`/api/tasks/${id}`),
  create: (data: {
    title: string;
    description?: string | null;
    taskType: string;
    priority: string;
    startDate?: string | null;
    dueDate?: string | null;
    estimatedHours?: number | null;
    isRecurring: boolean;
    recurringPattern?: string | null;
    parentTaskID?: string | null;
    assigneeIds: string[];
    primaryAssigneeId?: string | null;
    followerIds: string[];
    kpiIds: string[];
    lmsCourseIds: string[];
  }) => http<TaskDto>('/api/tasks', { method: 'POST', body: data }),
  update: (
    id: string,
    data: {
      title: string;
      description?: string | null;
      taskType: string;
      status: string;
      priority: string;
      progress: number;
      startDate?: string | null;
      dueDate?: string | null;
      estimatedHours?: number | null;
      actualHours?: number | null;
      isRecurring: boolean;
      recurringPattern?: string | null;
      parentTaskID?: string | null;
    },
  ) => http<TaskDto>(`/api/tasks/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => http<void>(`/api/tasks/${id}`, { method: 'DELETE' }),
  listComments: (id: string) => http<TaskCommentDto[]>(`/api/tasks/${id}/comments`),
  addComment: (id: string, data: { content: string; parentCommentID?: string | null }) =>
    http<TaskCommentDto>(`/api/tasks/${id}/comments`, { method: 'POST', body: data }),
};
