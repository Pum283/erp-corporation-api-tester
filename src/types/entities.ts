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
  permissions: string[];
  bypassDataScope: boolean;
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

export type NotificationChannel = 1 | 2 | 3;

export interface NotificationEventTypeDto {
  id: string;
  eventCode: string;
  name: string;
  module: string;
  description?: string | null;
  defaultTitleTemplate: string;
  defaultBodyTemplate: string;
  isActive: boolean;
}

export interface NotificationTriggerBindingDto {
  id: string;
  triggerKey: string;
  name: string;
  module: string;
  description?: string | null;
  eventTypeId?: string | null;
  eventCode?: string | null;
  eventTypeName?: string | null;
  linkUrlTemplate?: string | null;
  recipientRules: NotificationRecipientRulesDto;
  isActive: boolean;
}

export interface NotificationRecipientRulesDto {
  includeSubjectUser: boolean;
  includeActor: boolean;
  includeSuperAdmins: boolean;
  includeDepartmentManager: boolean;
  roleIds: string[];
  userIds: string[];
}

export interface UserNotificationDto {
  id: string;
  triggerKey: string;
  eventTypeId: string;
  title: string;
  body: string;
  linkUrl?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface UnreadNotificationCountDto {
  count: number;
}

export interface RealtimeNotificationPayload {
  notification: UserNotificationDto;
  unreadCount: number;
}

// Tasks
export type TaskType = 'Normal' | 'Recurring' | 'Project' | 'Onboarding' | 'Offboarding' | 'Training';
export type TaskStatus = 'ToDo' | 'InProgress' | 'Review' | 'Done' | 'Cancelled' | 'Overdue';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type RecurringPattern = 'None' | 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
export type TaskActivityAction = 'Created' | 'StatusChanged' | 'ProgressUpdated' | 'Assigned' | 'Unassigned' | 'DueDateChanged' | 'CommentAdded' | 'Completed' | 'Cancelled' | 'SubtaskAdded';

export interface TaskAssigneeDto {
  userID: string;
  fullName: string;
  employeeCode: string;
  assignedAt: string;
  assignedBy: string;
  isPrimaryAssignee: boolean;
}

export interface TaskFollowerDto {
  userID: string;
  fullName: string;
  employeeCode: string;
  followedAt: string;
}

export interface TaskCommentDto {
  id: string;
  taskID: string;
  userID: string;
  fullName: string;
  avatarUrl?: string | null;
  content: string;
  parentCommentID?: string | null;
  createdAt: string;
  replies: TaskCommentDto[];
}

export interface TaskActivityLogDto {
  id: string;
  taskID: string;
  userID: string;
  fullName: string;
  action: TaskActivityAction;
  oldValue?: string | null;
  newValue?: string | null;
  createdAt: string;
}

export interface TaskDto {
  id: string;
  taskCode: string;
  title: string;
  description?: string | null;
  taskType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern | null;
  parentTaskID?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  assignees: TaskAssigneeDto[];
  followers: TaskFollowerDto[];
  comments: TaskCommentDto[];
  activityLogs: TaskActivityLogDto[];
  kpiIds: string[];
  lmsCourseIds: string[];
  subtasks: TaskDto[];
}

// Chat
export type ConversationType = 'Direct' | 'Group' | 'Channel';
export type RoleInConversation = 'Admin' | 'Member' | 'Viewer';
export type MessageType = 'Text' | 'Image' | 'Video' | 'File' | 'Voice' | 'TaskLink' | 'System' | 'Poll';

export interface ConversationMemberDto {
  userID: string;
  fullName: string;
  employeeCode: string;
  avatarUrl?: string | null;
  roleInConversation?: RoleInConversation | null;
  joinedAt: string;
  isMuted: boolean;
  isActive: boolean;
}

export interface MessageAttachmentDto {
  id: string;
  messageID: string;
  fileName: string;
  fileURL: string;
  fileType: string;
  fileSize: number;
  thumbnailURL?: string | null;
  uploadedAt: string;
}

export interface MessageReactionDto {
  id: string;
  messageID: string;
  userID: string;
  fullName: string;
  reactionType: string;
}

export interface MessageDto {
  id: string;
  conversationID: string;
  userID: string;
  fullName: string;
  avatarUrl?: string | null;
  content?: string | null;
  messageType: MessageType;
  parentMessageID?: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  sentAt: string;
  editedAt?: string | null;
  attachments: MessageAttachmentDto[];
  reactions: MessageReactionDto[];
  linkedTaskId?: string | null;
}

export interface ConversationDto {
  id: string;
  conversationType: ConversationType;
  title?: string | null;
  description?: string | null;
  isPrivate: boolean;
  isArchived: boolean;
  createdBy?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  members: ConversationMemberDto[];
  lastMessage?: MessageDto | null;
  unreadCount: number;
}
