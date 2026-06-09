import type { ScopeType, UserStatus } from '../types/entities';

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
