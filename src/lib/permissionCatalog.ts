import { permissionsApi, rolesApi } from '../api/services';
import type { PermissionDto } from '../types/entities';

/**
 * Danh sách quyền để gán cho vai trò hoặc hiển thị trong UI phân quyền.
 * - Quản lý quyền hệ thống: GET /api/permissions (system.permission.read)
 * - Gán quyền cho vai trò: GET /api/roles/permissions (system.role.read)
 */
export async function loadPermissionCatalog(
  canUsePermissionsApi: boolean,
): Promise<PermissionDto[]> {
  if (canUsePermissionsApi) {
    return permissionsApi.listAll();
  }
  return rolesApi.permissionsAll();
}
