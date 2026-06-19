import { FormEvent, useEffect, useState } from 'react';
import {
  PERMISSION_ACTION_OPTIONS,
  PERMISSION_MODULE_OPTIONS,
  permissionActionLabel,
  permissionModuleLabel,
} from '../constants/enums';
import { HttpError } from '../api/http';
import { permissionsApi } from '../api/services';
import { CanAccess } from '../components/auth/CanAccess';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import { Pagination } from '../components/ui/Pagination';
import { Select } from '../components/ui/Select';
import { useReferenceData } from '../context/ReferenceDataContext';
import { P } from '../config/permissions';
import { usePagination } from '../hooks/usePagination';
import type { PermissionAction, PermissionDto, PermissionModule } from '../types/entities';

const emptyForm = {
  permissionCode: '',
  permissionName: '',
  module: 7 as PermissionModule,
  action: 2 as PermissionAction,
  resource: '',
  description: '',
  isActive: true,
};

export function PermissionsPage() {
  const { refreshPermissions, ready } = useReferenceData();
  const {
    items,
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    loading,
    load,
    goToPage,
    changePageSize,
  } = usePagination(permissionsApi.list);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PermissionDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    load(page, pageSize).catch((e) =>
      setError(e instanceof HttpError ? e.message : 'Không tải được danh sách'),
    );
  }, [ready, page, pageSize, load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: PermissionDto) {
    setEditing(item);
    setForm({
      permissionCode: item.permissionCode,
      permissionName: item.permissionName,
      module: item.module,
      action: item.action,
      resource: item.resource,
      description: item.description ?? '',
      isActive: item.isActive,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await permissionsApi.update(editing.id, {
          permissionName: form.permissionName,
          description: form.description || null,
          isActive: form.isActive,
        });
        setSuccess('Cập nhật quyền thành công');
      } else {
        await permissionsApi.create({
          permissionCode: form.permissionCode,
          permissionName: form.permissionName,
          module: form.module,
          action: form.action,
          resource: form.resource,
          description: form.description || null,
        });
        setSuccess('Tạo quyền thành công');
      }
      setModalOpen(false);
      await refreshPermissions();
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: PermissionDto) {
    if (!confirm(`Vô hiệu hóa quyền "${item.permissionName}"?`)) return;
    try {
      await permissionsApi.remove(item.id);
      setSuccess('Đã vô hiệu hóa quyền');
      await refreshPermissions();
      await load(page, pageSize);
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div>
      <PageHeader
        title="Quyền hệ thống"
        subtitle="Quản lý mã quyền (permission) dùng trong RBAC"
        actions={
          <CanAccess permission={P.SYSTEM_PERMISSION_CREATE}>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Thêm quyền
            </button>
          </CanAccess>
        }
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="table-card">
        {loading ? (
          <p className="muted pad">Đang tải...</p>
        ) : (
          <table className="data-table responsive-table permissions-table">
            <thead>
              <tr>
                <th>Mã quyền</th>
                <th>Tên hiển thị</th>
                <th>Module</th>
                <th>Hành động</th>
                <th>Resource</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.permissionCode}</code>
                  </td>
                  <td>{p.permissionName}</td>
                  <td>{permissionModuleLabel(p.module)}</td>
                  <td>{permissionActionLabel(p.action)}</td>
                  <td>
                    <code>{p.resource}</code>
                  </td>
                  <td>
                    <Badge active={p.isActive}>{p.isActive ? 'Hoạt động' : 'Ngừng'}</Badge>
                  </td>
                  <td className="actions-cell">
                    <CanAccess permission={P.SYSTEM_PERMISSION_UPDATE}>
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(p)}>
                        Sửa
                      </button>
                    </CanAccess>
                    {p.isActive && (
                      <CanAccess permission={P.SYSTEM_PERMISSION_DELETE}>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(p)}
                        >
                          Xóa
                        </button>
                      </CanAccess>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          totalCount={totalCount}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPageChange={goToPage}
          onPageSizeChange={changePageSize}
        />
      </div>

      <Modal
        title={editing ? 'Cập nhật quyền' : 'Thêm quyền'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          {!editing ? (
            <>
              <label>
                Mã quyền *
                <input
                  required
                  placeholder="hrm.employee.read"
                  value={form.permissionCode}
                  onChange={(e) => setForm({ ...form, permissionCode: e.target.value })}
                />
              </label>
              <label>
                Resource *
                <input
                  required
                  placeholder="employee"
                  value={form.resource}
                  onChange={(e) => setForm({ ...form, resource: e.target.value })}
                />
              </label>
              <label>
                Module *
                <Select
                  required
                  value={form.module}
                  onChange={(v) =>
                    setForm({ ...form, module: Number(v) as PermissionModule })
                  }
                  options={PERMISSION_MODULE_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </label>
              <label>
                Hành động *
                <Select
                  required
                  value={form.action}
                  onChange={(v) =>
                    setForm({ ...form, action: Number(v) as PermissionAction })
                  }
                  options={PERMISSION_ACTION_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                />
              </label>
            </>
          ) : (
            <label className="span-2">
              Mã quyền
              <input value={form.permissionCode} disabled />
            </label>
          )}
          <label className="span-2">
            Tên hiển thị *
            <input
              required
              value={form.permissionName}
              onChange={(e) => setForm({ ...form, permissionName: e.target.value })}
            />
          </label>
          <label className="span-2">
            Mô tả
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          {editing && (
            <label className="checkbox-label span-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Đang hoạt động
            </label>
          )}
          <div className="form-actions span-2">
            <button type="button" className="btn" onClick={() => setModalOpen(false)}>
              Hủy
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {editing ? 'Lưu' : 'Tạo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
