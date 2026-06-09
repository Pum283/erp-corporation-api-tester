import { FormEvent, useCallback, useEffect, useState } from 'react';
import { HttpError } from '../api/http';
import { rolesApi } from '../api/services';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { PermissionDto, RoleDto } from '../types/entities';

export function RolesPage() {
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [permissions, setPermissions] = useState<PermissionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [editing, setEditing] = useState<RoleDto | null>(null);
  const [permRole, setPermRole] = useState<RoleDto | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set());

  const [createForm, setCreateForm] = useState({
    roleName: '',
    displayName: '',
    description: '',
    bypassDataScope: false,
  });
  const [editForm, setEditForm] = useState({
    displayName: '',
    description: '',
    bypassDataScope: false,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([rolesApi.list(), rolesApi.permissions()]);
      setRoles(r);
      setPermissions(p);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Không tải được dữ liệu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setCreateForm({ roleName: '', displayName: '', description: '', bypassDataScope: false });
    setFormOpen(true);
  }

  function openEdit(role: RoleDto) {
    setEditing(role);
    setEditForm({
      displayName: role.displayName,
      description: role.description ?? '',
      bypassDataScope: role.bypassDataScope,
      isActive: role.isActive,
    });
    setFormOpen(true);
  }

  function openPermissions(role: RoleDto) {
    setPermRole(role);
    setSelectedPermIds(new Set(role.permissions.map((p) => p.id)));
    setPermOpen(true);
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await rolesApi.create(createForm);
      setSuccess('Tạo vai trò thành công');
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Tạo thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await rolesApi.update(editing.id, editForm);
      setSuccess('Cập nhật vai trò thành công');
      setFormOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function savePermissions() {
    if (!permRole) return;
    setSaving(true);
    try {
      await rolesApi.updatePermissions(permRole.id, [...selectedPermIds]);
      setSuccess('Cập nhật quyền thành công');
      setPermOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Cập nhật quyền thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(role: RoleDto) {
    if (!confirm(`Vô hiệu hóa vai trò "${role.displayName}"?`)) return;
    try {
      await rolesApi.remove(role.id);
      setSuccess('Đã vô hiệu hóa vai trò');
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Xóa thất bại');
    }
  }

  function togglePerm(id: string) {
    setSelectedPermIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div>
      <PageHeader
        title="Vai trò & Quyền"
        subtitle={`${roles.length} vai trò · ${permissions.length} quyền trong hệ thống`}
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Thêm vai trò
          </button>
        }
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="table-card">
        {loading ? (
          <p className="muted pad">Đang tải...</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Tên kỹ thuật</th>
                <th>Tên hiển thị</th>
                <th>Quyền</th>
                <th>Bypass scope</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => (
                <tr key={r.id}>
                  <td>
                    <code>{r.roleName}</code>
                    {r.isSystemRole && <span className="tag">Hệ thống</span>}
                  </td>
                  <td>{r.displayName}</td>
                  <td>{r.permissions.length} quyền</td>
                  <td>{r.bypassDataScope ? 'Có' : 'Không'}</td>
                  <td>
                    <Badge active={r.isActive}>{r.isActive ? 'Hoạt động' : 'Ngừng'}</Badge>
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openPermissions(r)}>
                      Quyền
                    </button>
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(r)}>
                      Sửa
                    </button>
                    {!r.isSystemRole && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(r)}
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editing ? 'Cập nhật vai trò' : 'Thêm vai trò'}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      >
        {editing ? (
          <form className="form-grid" onSubmit={handleUpdate}>
            <label className="span-2">
              Tên hiển thị *
              <input
                required
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              />
            </label>
            <label className="span-2">
              Mô tả
              <textarea
                rows={2}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editForm.bypassDataScope}
                onChange={(e) => setEditForm({ ...editForm, bypassDataScope: e.target.checked })}
              />
              Bypass data scope
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
              Đang hoạt động
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Lưu
              </button>
            </div>
          </form>
        ) : (
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Tên kỹ thuật *
              <input
                required
                placeholder="ROLE_ACCOUNTANT"
                value={createForm.roleName}
                onChange={(e) => setCreateForm({ ...createForm, roleName: e.target.value })}
              />
            </label>
            <label>
              Tên hiển thị *
              <input
                required
                value={createForm.displayName}
                onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
              />
            </label>
            <label className="span-2">
              Mô tả
              <textarea
                rows={2}
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </label>
            <label className="checkbox-label span-2">
              <input
                type="checkbox"
                checked={createForm.bypassDataScope}
                onChange={(e) =>
                  setCreateForm({ ...createForm, bypassDataScope: e.target.checked })
                }
              />
              Bypass data scope
            </label>
            <div className="form-actions span-2">
              <button type="button" className="btn" onClick={() => setFormOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                Tạo
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        title={`Phân quyền: ${permRole?.displayName ?? ''}`}
        open={permOpen}
        onClose={() => setPermOpen(false)}
        wide
      >
        <div className="perm-grid">
          {permissions.map((p) => (
            <label key={p.id} className="perm-item">
              <input
                type="checkbox"
                checked={selectedPermIds.has(p.id)}
                onChange={() => togglePerm(p.id)}
              />
              <div>
                <code>{p.permissionCode}</code>
                <small>{p.permissionName}</small>
              </div>
            </label>
          ))}
        </div>
        <div className="form-actions">
          <button type="button" className="btn" onClick={() => setPermOpen(false)}>
            Hủy
          </button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={savePermissions}>
            Lưu quyền ({selectedPermIds.size})
          </button>
        </div>
      </Modal>
    </div>
  );
}
