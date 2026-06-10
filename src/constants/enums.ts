import type { ScopeType, UserStatus } from '../types/entities';
import type { PermissionAction, PermissionModule } from '../types/entities';

export const USER_STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 1, label: 'Đang làm việc' },
  { value: 2, label: 'Thử việc' },
  { value: 3, label: 'Đã nghỉ' },
  { value: 4, label: 'Chấm dứt HĐ' },
  { value: 5, label: 'Tạm ngưng' },
  { value: 6, label: 'Nghỉ thai sản' },
];

export const SCOPE_TYPE_OPTIONS: { value: ScopeType; label: string }[] = [
  { value: 1, label: 'Own — Chỉ bản thân' },
  { value: 2, label: 'Team — Nhóm trực tiếp' },
  { value: 3, label: 'Department — Phòng ban' },
  { value: 4, label: 'All — Toàn hệ thống' },
];

export function userStatusLabel(status: UserStatus): string {
  return USER_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? String(status);
}

export function scopeTypeLabel(scope: ScopeType): string {
  return SCOPE_TYPE_OPTIONS.find((o) => o.value === scope)?.label ?? String(scope);
}

export const PERMISSION_MODULE_OPTIONS: { value: PermissionModule; label: string }[] = [
  { value: 1, label: 'HRM — Nhân sự' },
  { value: 2, label: 'LMS — Đào tạo' },
  { value: 3, label: 'Payroll — Lương' },
  { value: 4, label: 'Task — Công việc' },
  { value: 5, label: 'Chat' },
  { value: 6, label: 'Report — Báo cáo' },
  { value: 7, label: 'System — Hệ thống' },
  { value: 8, label: 'KPI' },
  { value: 9, label: 'Onboarding' },
];

export const PERMISSION_ACTION_OPTIONS: { value: PermissionAction; label: string }[] = [
  { value: 1, label: 'Create — Tạo mới' },
  { value: 2, label: 'Read — Xem' },
  { value: 3, label: 'Update — Cập nhật' },
  { value: 4, label: 'Delete — Xóa' },
  { value: 5, label: 'Approve — Duyệt' },
  { value: 6, label: 'Assign — Gán' },
  { value: 7, label: 'Export — Xuất' },
  { value: 8, label: 'ManageTemplate' },
];

export function permissionModuleLabel(module: PermissionModule): string {
  return PERMISSION_MODULE_OPTIONS.find((o) => o.value === module)?.label ?? String(module);
}

export function permissionActionLabel(action: PermissionAction): string {
  return PERMISSION_ACTION_OPTIONS.find((o) => o.value === action)?.label ?? String(action);
}
