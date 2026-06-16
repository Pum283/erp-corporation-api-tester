import { useEffect, useMemo, useRef, useState } from 'react';
import { permissionModuleLabel } from '../../constants/enums';
import type { PermissionDto, PermissionModule } from '../../types/entities';
import { IconChevronDown, IconSearch } from './Icons';

interface PermissionPickerProps {
  permissions: PermissionDto[];
  selectedIds: Set<string>;
  onChange: (ids: Set<string>) => void;
  resetKey?: string;
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function matchesSearch(permission: PermissionDto, query: string) {
  if (!query) return true;
  const haystack = [
    permission.permissionCode,
    permission.permissionName,
    permission.resource,
    permission.description ?? '',
    permissionModuleLabel(permission.module),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export function PermissionPicker({
  permissions,
  selectedIds,
  onChange,
  resetKey = '',
}: PermissionPickerProps) {
  const [search, setSearch] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Set<number>>(new Set());

  const query = normalizeSearch(search);

  const activePermissions = useMemo(
    () => permissions.filter((p) => p.isActive),
    [permissions],
  );

  const filteredPermissions = useMemo(
    () => activePermissions.filter((p) => matchesSearch(p, query)),
    [activePermissions, query],
  );

  const groups = useMemo(() => {
    const map = new Map<PermissionModule, PermissionDto[]>();
    for (const permission of filteredPermissions) {
      const list = map.get(permission.module) ?? [];
      list.push(permission);
      map.set(permission.module, list);
    }

    return [...map.entries()]
      .sort(([a], [b]) => a - b)
      .map(([module, items]) => ({
        module,
        label: permissionModuleLabel(module),
        items: items.sort((a, b) => a.permissionCode.localeCompare(b.permissionCode)),
      }));
  }, [filteredPermissions]);

  useEffect(() => {
    const modulesWithSelection = new Set(
      activePermissions.filter((permission) => selectedIds.has(permission.id)).map((p) => p.module),
    );
    const nextCollapsed = new Set<number>();
    for (const permission of activePermissions) {
      if (!modulesWithSelection.has(permission.module)) {
        nextCollapsed.add(permission.module);
      }
    }
    setCollapsedModules(nextCollapsed);
    setSearch('');
  }, [resetKey, activePermissions]);

  function togglePermission(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  }

  function toggleModule(_module: PermissionModule, items: PermissionDto[]) {
    const allSelected = items.every((item) => selectedIds.has(item.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      items.forEach((item) => next.delete(item.id));
    } else {
      items.forEach((item) => next.add(item.id));
    }
    onChange(next);
  }

  function toggleCollapsed(module: PermissionModule) {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  }

  function expandAll() {
    setCollapsedModules(new Set());
  }

  function collapseAll() {
    setCollapsedModules(new Set(groups.map((group) => group.module)));
  }

  function selectFiltered() {
    const next = new Set(selectedIds);
    filteredPermissions.forEach((permission) => next.add(permission.id));
    onChange(next);
  }

  function clearFiltered() {
    const filteredIds = new Set(filteredPermissions.map((permission) => permission.id));
    const next = new Set([...selectedIds].filter((id) => !filteredIds.has(id)));
    onChange(next);
  }

  const selectedVisibleCount = filteredPermissions.filter((permission) =>
    selectedIds.has(permission.id),
  ).length;

  return (
    <div className="perm-picker">
      <div className="perm-picker-toolbar">
        <label className="perm-picker-search">
          <IconSearch className="perm-picker-search-icon" width={16} height={16} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã, tên, resource..."
          />
        </label>
        <div className="perm-picker-toolbar-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={expandAll}>
            Mở rộng
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={collapseAll}>
            Thu gọn
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={selectFiltered}>
            Chọn kết quả
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={clearFiltered}>
            Bỏ chọn kết quả
          </button>
        </div>
      </div>

      <div className="perm-picker-summary">
        <span>
          Đã chọn <strong>{selectedVisibleCount}</strong> / {filteredPermissions.length} quyền
          {query ? ' (đang lọc)' : ''}
        </span>
        <span className="muted">
          Tổng hệ thống: {selectedIds.size}/{activePermissions.length}
        </span>
      </div>

      <div className="perm-picker-scroll">
        {groups.length === 0 ? (
          <p className="perm-picker-empty">Không tìm thấy quyền phù hợp.</p>
        ) : (
          groups.map((group) => (
            <ModuleGroup
              key={group.module}
              group={group}
              collapsed={collapsedModules.has(group.module)}
              selectedIds={selectedIds}
              onToggleCollapsed={() => toggleCollapsed(group.module)}
              onToggleModule={() => toggleModule(group.module, group.items)}
              onTogglePermission={togglePermission}
            />
          ))
        )}
      </div>
    </div>
  );
}

interface ModuleGroupProps {
  group: {
    module: PermissionModule;
    label: string;
    items: PermissionDto[];
  };
  collapsed: boolean;
  selectedIds: Set<string>;
  onToggleCollapsed: () => void;
  onToggleModule: () => void;
  onTogglePermission: (id: string) => void;
}

function ModuleGroup({
  group,
  collapsed,
  selectedIds,
  onToggleCollapsed,
  onToggleModule,
  onTogglePermission,
}: ModuleGroupProps) {
  const moduleCheckboxRef = useRef<HTMLInputElement>(null);
  const selectedCount = group.items.filter((item) => selectedIds.has(item.id)).length;
  const allSelected = selectedCount === group.items.length && group.items.length > 0;
  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (moduleCheckboxRef.current) {
      moduleCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <section className={`perm-picker-group${collapsed ? ' is-collapsed' : ''}`}>
      <div className="perm-picker-group-head">
        <button
          type="button"
          className="perm-picker-group-toggle"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          <IconChevronDown className="perm-picker-group-chevron" width={16} height={16} />
          <span className="perm-picker-group-title">{group.label}</span>
          <span className="perm-picker-group-count">
            {selectedCount}/{group.items.length}
          </span>
        </button>
        <label className="perm-picker-group-select" onClick={(e) => e.stopPropagation()}>
          <input
            ref={moduleCheckboxRef}
            type="checkbox"
            checked={allSelected}
            onChange={onToggleModule}
          />
          <span>Chọn nhóm</span>
        </label>
      </div>

      {!collapsed && (
        <ul className="perm-picker-list">
          {group.items.map((permission) => (
            <li key={permission.id}>
              <label
                className={`perm-picker-row${selectedIds.has(permission.id) ? ' is-selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(permission.id)}
                  onChange={() => onTogglePermission(permission.id)}
                />
                <span className="perm-picker-row-body">
                  <code>{permission.permissionCode}</code>
                  <span>{permission.permissionName}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
