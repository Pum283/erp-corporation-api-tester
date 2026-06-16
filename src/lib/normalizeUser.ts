import type { UserDto } from '../types/entities';

/** Đảm bảo roles/permissions luôn là mảng — tránh crash khi API cũ trả null. */
export function normalizeUser(profile: UserDto): UserDto {
  return {
    ...profile,
    roles: Array.isArray(profile.roles) ? profile.roles : [],
    permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
    bypassDataScope: profile.bypassDataScope === true,
  };
}
