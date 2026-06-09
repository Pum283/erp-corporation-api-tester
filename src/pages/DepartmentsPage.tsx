import { FormEvent, useCallback, useEffect, useState } from 'react';
import { HttpError } from '../api/http';
import { departmentsApi, usersApi } from '../api/services';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { DepartmentDto, UserDto } from '../types/entities';

const emptyForm = {
  departmentName: '',
  departmentCode: '',
  parentDepartmentId: '',
  managerId: '',
  description: '',
  isActive: true,
};

export function DepartmentsPage() {
  const [items, setItems] = useState<DepartmentDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [depts, userList] = await Promise.all([departmentsApi.list(), usersApi.list()]);
      setItems(depts);
      setUsers(userList);
    } catch (e) {
      setError(e instanceof HttpError ? e.message : 'Không tải được danh sách');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(item: DepartmentDto) {
    setEditing(item);
    setForm({
      departmentName: item.departmentName,
      departmentCode: item.departmentCode,
      parentDepartmentId: item.parentDepartmentId ?? '',
      managerId: item.managerId ?? '',
      description: item.description ?? '',
      isActive: item.isActive,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      departmentName: form.departmentName,
      departmentCode: form.departmentCode,
      parentDepartmentId: form.parentDepartmentId || null,
      managerId: form.managerId || null,
      description: form.description || null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await departmentsApi.update(editing.id, payload);
        setSuccess('Cập nhật phòng ban thành công');
      } else {
        await departmentsApi.create(payload);
        setSuccess('Tạo phòng ban thành công');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: DepartmentDto) {
    if (!confirm(`Vô hiệu hóa phòng ban "${item.departmentName}"?`)) return;
    try {
      await departmentsApi.remove(item.id);
      setSuccess('Đã vô hiệu hóa phòng ban');
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div>
      <PageHeader
        title="Phòng ban"
        subtitle="Quản lý cơ cấu tổ chức, phòng ban cha/con và trưởng phòng"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Thêm phòng ban
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
                <th>Mã</th>
                <th>Tên phòng ban</th>
                <th>Phòng cha</th>
                <th>Trưởng phòng</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td>
                    <code>{d.departmentCode}</code>
                  </td>
                  <td>{d.departmentName}</td>
                  <td>{d.parentDepartmentName ?? '—'}</td>
                  <td>{d.managerName ?? '—'}</td>
                  <td>
                    <Badge active={d.isActive}>{d.isActive ? 'Hoạt động' : 'Ngừng'}</Badge>
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(d)}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(d)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        title={editing ? 'Cập nhật phòng ban' : 'Thêm phòng ban'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Tên phòng ban *
            <input
              required
              value={form.departmentName}
              onChange={(e) => setForm({ ...form, departmentName: e.target.value })}
            />
          </label>
          <label>
            Mã phòng ban *
            <input
              required
              value={form.departmentCode}
              onChange={(e) => setForm({ ...form, departmentCode: e.target.value })}
            />
          </label>
          <label>
            Phòng ban cha
            <select
              value={form.parentDepartmentId}
              onChange={(e) => setForm({ ...form, parentDepartmentId: e.target.value })}
            >
              <option value="">— Không có —</option>
              {items
                .filter((d) => d.id !== editing?.id)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.departmentCode} — {d.departmentName}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Trưởng phòng
            <select
              value={form.managerId}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
            >
              <option value="">— Chưa gán —</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.employeeCode} — {u.fullName}
                </option>
              ))}
            </select>
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
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
