import { FormEvent, useCallback, useEffect, useState } from 'react';
import { SCOPE_TYPE_OPTIONS, scopeTypeLabel } from '../constants/enums';
import { HttpError } from '../api/http';
import { jobLevelsApi } from '../api/services';
import { Alert } from '../components/ui/Alert';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { PageHeader } from '../components/ui/PageHeader';
import type { JobLevelDto, ScopeType } from '../types/entities';

const emptyForm = {
  levelName: '',
  levelOrder: 1,
  defaultScopeType: 3 as ScopeType,
  description: '',
  baseSalaryMin: '',
  baseSalaryMax: '',
  isActive: true,
};

export function JobLevelsPage() {
  const [items, setItems] = useState<JobLevelDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobLevelDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await jobLevelsApi.list());
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

  function openEdit(item: JobLevelDto) {
    setEditing(item);
    setForm({
      levelName: item.levelName,
      levelOrder: item.levelOrder,
      defaultScopeType: item.defaultScopeType,
      description: item.description ?? '',
      baseSalaryMin: item.baseSalaryMin?.toString() ?? '',
      baseSalaryMax: item.baseSalaryMax?.toString() ?? '',
      isActive: item.isActive,
    });
    setModalOpen(true);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      levelName: form.levelName,
      levelOrder: Number(form.levelOrder),
      defaultScopeType: form.defaultScopeType,
      description: form.description || null,
      baseSalaryMin: form.baseSalaryMin ? Number(form.baseSalaryMin) : null,
      baseSalaryMax: form.baseSalaryMax ? Number(form.baseSalaryMax) : null,
      isActive: form.isActive,
    };
    try {
      if (editing) {
        await jobLevelsApi.update(editing.id, payload);
        setSuccess('Cập nhật cấp bậc thành công');
      } else {
        await jobLevelsApi.create(payload);
        setSuccess('Tạo cấp bậc thành công');
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: JobLevelDto) {
    if (!confirm(`Vô hiệu hóa cấp bậc "${item.levelName}"?`)) return;
    try {
      await jobLevelsApi.remove(item.id);
      setSuccess('Đã vô hiệu hóa cấp bậc');
      await load();
    } catch (err) {
      setError(err instanceof HttpError ? err.message : 'Xóa thất bại');
    }
  }

  return (
    <div>
      <PageHeader
        title="Cấp bậc chức danh"
        subtitle="Quản lý Job Level và phạm vi dữ liệu mặc định (Scope)"
        actions={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Thêm cấp bậc
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
                <th>Thứ tự</th>
                <th>Tên cấp bậc</th>
                <th>Scope mặc định</th>
                <th>Lương min–max</th>
                <th>Trạng thái</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((j) => (
                <tr key={j.id}>
                  <td>{j.levelOrder}</td>
                  <td>{j.levelName}</td>
                  <td>{scopeTypeLabel(j.defaultScopeType)}</td>
                  <td>
                    {j.baseSalaryMin ?? '—'} – {j.baseSalaryMax ?? '—'}
                  </td>
                  <td>
                    <Badge active={j.isActive}>{j.isActive ? 'Hoạt động' : 'Ngừng'}</Badge>
                  </td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-sm" onClick={() => openEdit(j)}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(j)}
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
        title={editing ? 'Cập nhật cấp bậc' : 'Thêm cấp bậc'}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      >
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Tên cấp bậc *
            <input
              required
              value={form.levelName}
              onChange={(e) => setForm({ ...form, levelName: e.target.value })}
            />
          </label>
          <label>
            Thứ tự *
            <input
              type="number"
              required
              min={1}
              value={form.levelOrder}
              onChange={(e) => setForm({ ...form, levelOrder: Number(e.target.value) })}
            />
          </label>
          <label>
            Scope mặc định *
            <select
              value={form.defaultScopeType}
              onChange={(e) =>
                setForm({ ...form, defaultScopeType: Number(e.target.value) as ScopeType })
              }
            >
              {SCOPE_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Lương tối thiểu
            <input
              type="number"
              value={form.baseSalaryMin}
              onChange={(e) => setForm({ ...form, baseSalaryMin: e.target.value })}
            />
          </label>
          <label>
            Lương tối đa
            <input
              type="number"
              value={form.baseSalaryMax}
              onChange={(e) => setForm({ ...form, baseSalaryMax: e.target.value })}
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
              {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
