import type { ComponentType } from 'react';
import {
  IconBuilding,
  IconDashboard,
  IconFileText,
  IconKey,
  IconLayers,
  IconLink,
  IconShield,
  IconUsers,
  IconMessage,
  IconClipboard,
} from '../components/ui/Icons';

/** Mã quyền khớp với backend AuthorizePermission / CrudPermissions */
export const P = {
  HRM_EMPLOYEE_READ: 'hrm.employee.read',
  HRM_EMPLOYEE_CREATE: 'hrm.employee.create',
  HRM_EMPLOYEE_UPDATE: 'hrm.employee.update',
  HRM_EMPLOYEE_DELETE: 'hrm.employee.delete',
  HRM_DEPARTMENT_READ: 'hrm.department.read',
  HRM_DEPARTMENT_CREATE: 'hrm.department.create',
  HRM_DEPARTMENT_UPDATE: 'hrm.department.update',
  HRM_DEPARTMENT_DELETE: 'hrm.department.delete',
  HRM_JOBLEVEL_READ: 'hrm.joblevel.read',
  HRM_JOBLEVEL_CREATE: 'hrm.joblevel.create',
  HRM_JOBLEVEL_UPDATE: 'hrm.joblevel.update',
  HRM_JOBLEVEL_DELETE: 'hrm.joblevel.delete',
  SYSTEM_ROLE_READ: 'system.role.read',
  SYSTEM_ROLE_CREATE: 'system.role.create',
  SYSTEM_ROLE_UPDATE: 'system.role.update',
  SYSTEM_ROLE_ASSIGN: 'system.role.assign',
  SYSTEM_PERMISSION_READ: 'system.permission.read',
  SYSTEM_PERMISSION_CREATE: 'system.permission.create',
  SYSTEM_PERMISSION_UPDATE: 'system.permission.update',
  SYSTEM_PERMISSION_DELETE: 'system.permission.delete',
  SYSTEM_USER_RESETPASSWORD: 'system.user.resetpassword',
  SYSTEM_NOTIFICATION_EVENT_READ: 'system.notification.event.read',
  SYSTEM_NOTIFICATION_EVENT_CREATE: 'system.notification.event.create',
  SYSTEM_NOTIFICATION_EVENT_UPDATE: 'system.notification.event.update',
  SYSTEM_NOTIFICATION_EVENT_DELETE: 'system.notification.event.delete',
  SYSTEM_NOTIFICATION_TRIGGER_READ: 'system.notification.trigger.read',
  SYSTEM_NOTIFICATION_TRIGGER_UPDATE: 'system.notification.trigger.update',
  CHAT_CONVERSATION_READ: 'chat.conversation.read',
  CHAT_CONVERSATION_CREATE: 'chat.conversation.create',
  CHAT_CONVERSATION_UPDATE: 'chat.conversation.update',
  CHAT_CONVERSATION_DELETE: 'chat.conversation.delete',
  CHAT_MESSAGE_CREATE: 'chat.message.create',
  CHAT_MESSAGE_UPDATE: 'chat.message.update',
  CHAT_MESSAGE_DELETE: 'chat.message.delete',
  CHAT_MEMBER_MANAGE: 'chat.member.manage',
  CHAT_ADMIN_MANAGE: 'chat.admin.manage',
  TASK_ITEM_READ: 'task.item.read',
  TASK_ITEM_CREATE: 'task.item.create',
  TASK_ITEM_UPDATE: 'task.item.update',
  TASK_ITEM_DELETE: 'task.item.delete',
  TASK_ITEM_ASSIGN: 'task.item.assign',
  TASK_ITEM_APPROVE: 'task.item.approve',
  TASK_COMMENT_CREATE: 'task.comment.create',
  TASK_REPORT_READ: 'task.report.read',
} as const;

export type PermissionCode = (typeof P)[keyof typeof P];

export interface NavItemDef {
  to: string;
  label: string;
  icon: ComponentType<{ width?: number; height?: number }>;
  permission?: PermissionCode;
  end?: boolean;
}

export interface NavSectionDef {
  title: string;
  items: NavItemDef[];
}

export const NAV_SECTIONS: NavSectionDef[] = [
  {
    title: 'Tổng quan',
    items: [{ to: '/', label: 'Dashboard', icon: IconDashboard, end: true }],
  },
  {
    title: 'Cộng tác',
    items: [
      { to: '/chat', label: 'Chat nội bộ', icon: IconMessage, permission: P.CHAT_CONVERSATION_READ },
      { to: '/tasks', label: 'Quản lý công việc', icon: IconClipboard, permission: P.TASK_ITEM_READ },
    ],
  },
  {
    title: 'Nhân sự',
    items: [
      { to: '/users', label: 'Nhân sự', icon: IconUsers, permission: P.HRM_EMPLOYEE_READ },
      { to: '/departments', label: 'Phòng ban', icon: IconBuilding, permission: P.HRM_DEPARTMENT_READ },
      { to: '/job-levels', label: 'Cấp bậc', icon: IconLayers, permission: P.HRM_JOBLEVEL_READ },
    ],
  },
  {
    title: 'Phân quyền',
    items: [
      { to: '/roles', label: 'Vai trò', icon: IconShield, permission: P.SYSTEM_ROLE_READ },
      { to: '/permissions', label: 'Quyền hệ thống', icon: IconKey, permission: P.SYSTEM_PERMISSION_READ },
    ],
  },
  {
    title: 'Thông báo',
    items: [
      {
        to: '/notification-event-types',
        label: 'Loại thông báo',
        icon: IconFileText,
        permission: P.SYSTEM_NOTIFICATION_EVENT_READ,
      },
      {
        to: '/notification-triggers',
        label: 'Gán thông báo',
        icon: IconLink,
        permission: P.SYSTEM_NOTIFICATION_TRIGGER_READ,
      },
    ],
  },
];

export const ROUTE_PERMISSIONS: Record<string, PermissionCode | undefined> = {
  '/': undefined,
  '/chat': P.CHAT_CONVERSATION_READ,
  '/tasks': P.TASK_ITEM_READ,
  '/users': P.HRM_EMPLOYEE_READ,
  '/departments': P.HRM_DEPARTMENT_READ,
  '/job-levels': P.HRM_JOBLEVEL_READ,
  '/roles': P.SYSTEM_ROLE_READ,
  '/permissions': P.SYSTEM_PERMISSION_READ,
  '/notification-event-types': P.SYSTEM_NOTIFICATION_EVENT_READ,
  '/notification-triggers': P.SYSTEM_NOTIFICATION_TRIGGER_READ,
};
