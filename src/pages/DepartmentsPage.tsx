import { FormEvent, useEffect, useState } from 'react';
import { HttpError } from '../api/http';
import { departmentsApi, usersApi } from '../api/services';
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
  const { departments: allDepartments, refreshDepartments, ready } = useReferenceData();
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
  } = usePagination(departmentsApi.list);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setUsersLoading(true);
    usersApi
      .listAll()
      .then(setUsers)
      .catch((e) => setError(e instanceof HttpError ? e.message : 'Không tải được nhân sự'))
      .finally(() => setUsersLoading(false));
  }, [ready]);

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
      await refreshDepartments();
      await load(page, pageSize);
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
      await refreshDepartments();
      await load(page, pageSize);
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
          <CanAccess permission={P.HRM_DEPARTMENT_CREATE}>
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Thêm phòng ban
            </button>
          </CanAccess>
        }
      />
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess(null)} />}

      <div className="table-card">
        {loading || usersLoading ? (
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
                    <CanAccess permission={P.HRM_DEPARTMENT_UPDATE}>
                      <button type="button" className="btn btn-sm" onClick={() => openEdit(d)}>
                        Sửa
                      </button>
                    </CanAccess>
                    <CanAccess permission={P.HRM_DEPARTMENT_DELETE}>
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(d)}
                      >
                        Xóa
                      </button>
                    </CanAccess>
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
        title={editing ? 'Cập nhật phòng ban' : 'Thêm phòng ban'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        wide
      >
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
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
            <Select
              value={form.parentDepartmentId}
              placeholder="— Không có —"
              onChange={(v) => setForm({ ...form, parentDepartmentId: v })}
              options={[
                { value: '', label: '— Không có —' },
                ...allDepartments
                  .filter((d) => d.id !== editing?.id)
                  .map((d) => ({
                    value: d.id,
                    label: `${d.departmentCode} — ${d.departmentName}`,
                  })),
              ]}
            />
          </label>
          <label>
            Trưởng phòng
            <Select
              value={form.managerId}
              placeholder="— Chưa gán —"
              onChange={(v) => setForm({ ...form, managerId: v })}
              options={[
                { value: '', label: '— Chưa gán —' },
                ...users.map((u) => ({
                  value: u.id,
                  label: `${u.employeeCode} — ${u.fullName}`,
                })),
              ]}
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
          </div>
          <div className="modal-footer">
            <div className="modal-footer-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
                Hủy
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving || usersLoading}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
