import { useRef, useState, useEffect, useCallback } from 'react';
import type { DepartmentDto } from '../../types/entities';
import './DepartmentTree.css';

interface TreeNode extends DepartmentDto {
  children: TreeNode[];
  depth: number;
}

interface Props {
  departments: DepartmentDto[];
  onEdit: (dept: DepartmentDto) => void;
  onDelete: (dept: DepartmentDto) => void;
  onReparent?: (deptId: string, newParentId: string | null) => Promise<void>;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface DragState {
  draggingId: string | null;
}

interface Position {
  x: number;
  y: number;
}

// 6 Color Palettes matching visual theme
const PALETTES = [
  { bg: 'var(--palette-1-bg, #ffe4e6)', fg: 'var(--palette-1-fg, #f43f5e)', border: 'var(--palette-1-border, #fecdd3)', dot: '#f43f5e' }, // Coral
  { bg: 'var(--palette-2-bg, #eff6ff)', fg: 'var(--palette-2-fg, #3b82f6)', border: 'var(--palette-2-border, #bfdbfe)', dot: '#3b82f6' }, // Blue
  { bg: 'var(--palette-3-bg, #ecfdf5)', fg: 'var(--palette-3-fg, #10b981)', border: 'var(--palette-3-border, #a7f3d0)', dot: '#10b981' }, // Green
  { bg: 'var(--palette-4-bg, #f5f3ff)', fg: 'var(--palette-4-fg, #8b5cf6)', border: 'var(--palette-4-border, #ddd6fe)', dot: '#8b5cf6' }, // Purple
  { bg: 'var(--palette-5-bg, #fffbeb)', fg: 'var(--palette-5-fg, #f59e0b)', border: 'var(--palette-5-border, #fef3c7)', dot: '#f59e0b' }, // Amber
  { bg: 'var(--palette-6-bg, #f8fafc)', fg: 'var(--palette-6-fg, #64748b)', border: 'var(--palette-6-border, #e2e8f0)', dot: '#64748b' }, // Slate
];

function getPalette(code: string) {
  const charCodeSum = (code || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return PALETTES[charCodeSum % PALETTES.length];
}

function getInitials(name: string, code: string): string {
  if (code && code.trim().length >= 2) {
    return code.trim().substring(0, 2).toUpperCase();
  }
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name || 'DP').substring(0, 2).toUpperCase();
}

function buildTree(departments: DepartmentDto[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  departments.forEach((d) =>
    map.set(d.id, { ...d, children: [], depth: 0 }),
  );

  const roots: TreeNode[] = [];
  map.forEach((node) => {
    const parent = node.parentDepartmentId ? map.get(node.parentDepartmentId) : undefined;
    if (parent) {
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Re-calculate depths recursively
  function fixDepth(nodes: TreeNode[], depth: number) {
    nodes.forEach((n) => {
      n.depth = depth;
      fixDepth(n.children, depth + 1);
    });
  }
  fixDepth(roots, 0);

  return roots;
}

// Tree layout spacing algorithm (X coordinates)
function calculatePositions(roots: TreeNode[]): Map<string, Position> {
  const coords = new Map<string, Position>();
  let currentX = 100;

  function layoutNode(node: TreeNode, depth: number): number {
    const y = depth * 220 + 80; // Vertical spacing 220px
    if (node.children.length === 0) {
      const x = currentX;
      coords.set(node.id, { x, y });
      currentX += 280; // Card width 230 + 50 padding
      return x;
    }

    const childXs = node.children.map((child) => layoutNode(child, depth + 1));
    const x = (childXs[0] + childXs[childXs.length - 1]) / 2;
    coords.set(node.id, { x, y });
    return x;
  }

  roots.forEach((root) => {
    layoutNode(root, 0);
    currentX += 60; // Padding between disjoint root trees
  });

  return coords;
}

// Check if childId is descendant of parentId to prevent circular paths
function isDescendant(childId: string, parentId: string, departments: DepartmentDto[]): boolean {
  let current = departments.find((d) => d.id === childId);
  while (current && current.parentDepartmentId) {
    if (current.parentDepartmentId === parentId) return true;
    const nextParentId = current.parentDepartmentId;
    current = departments.find((d) => d.id === nextParentId);
  }
  return false;
}

export function DepartmentTree({ departments, onEdit, onDelete, onReparent, canEdit, canDelete }: Props) {
  const roots = buildTree(departments);

  // States
  const [nodePositions, setNodePositions] = useState<Map<string, Position>>(new Map());
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [dragState, setDragState] = useState<DragState>({ draggingId: null });
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Pan and Zoom Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 100, y: 80 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);

  // Node position drag state
  const [activeDragNode, setActiveDragNode] = useState<string | null>(null);
  const nodeDragStart = useRef({ x: 0, y: 0 });
  const nodePosStart = useRef({ x: 0, y: 0 });

  // Gripper click helper
  const gripperActive = useRef<string | null>(null);
  const [isGripperDrag, setIsGripperDrag] = useState<boolean>(false);

  // Root drop target state
  const [rootDropping, setRootDropping] = useState(false);

  // Initialize/update tree layout coords
  const computeInitialLayout = useCallback(() => {
    const initialCoords = calculatePositions(roots);
    setNodePositions((prev) => {
      const next = new Map(prev);
      initialCoords.forEach((val, key) => {
        // Keep manually dragged positions if already present
        if (!next.has(key)) {
          next.set(key, val);
        }
      });
      return next;
    });
  }, [roots]);

  useEffect(() => {
    if (departments.length > 0) {
      computeInitialLayout();
    }
  }, [departments.length]);

  // Center tree horizontally
  const centerTree = useCallback(() => {
    if (canvasRef.current) {
      const canvasWidth = canvasRef.current.clientWidth;
      setPan({ x: canvasWidth / 2 - 250, y: 80 }); // Centers first layout
      setZoom(1);
    }
  }, []);

  // Force Auto-layout / Recenter
  const handleAutoLayout = () => {
    const coords = calculatePositions(roots);
    setNodePositions(coords);
    centerTree();
  };

  // Canvas Panning Handlers
  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return; // Left click only
    const target = e.target as HTMLElement;
    if (
      target.closest('.org-card-wrapper') ||
      target.closest('.org-controls') ||
      target.closest('.org-root-dropzone')
    ) {
      return;
    }
    setIsDraggingCanvas(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }

  // Node Drag Handlers (Canvas coordinate movement)
  function handleNodeMouseDown(e: React.MouseEvent, nodeId: string) {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Don't drag if clicked on button elements
    if (
      target.closest('.org-action-btn') ||
      target.closest('.org-toggle-btn') ||
      target.closest('.org-drag-handle')
    ) {
      return;
    }
    e.stopPropagation(); // Stop canvas panning drag

    setActiveDragNode(nodeId);
    nodeDragStart.current = { x: e.clientX, y: e.clientY };
    const currentPos = nodePositions.get(nodeId) || { x: 0, y: 0 };
    nodePosStart.current = { ...currentPos };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (activeDragNode) {
      // Move Node position (adjusting client differences by zoom factor)
      const dx = (e.clientX - nodeDragStart.current.x) / zoom;
      const dy = (e.clientY - nodeDragStart.current.y) / zoom;
      setNodePositions((prev) => {
        const next = new Map(prev);
        next.set(activeDragNode, {
          x: nodePosStart.current.x + dx,
          y: nodePosStart.current.y + dy,
        });
        return next;
      });
    } else if (isDraggingCanvas) {
      // Pan Canvas
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      setPan({
        x: panStart.current.x + dx,
        y: panStart.current.y + dy,
      });
    }
  }

  function handleMouseUpOrLeave() {
    setIsDraggingCanvas(false);
    setActiveDragNode(null);
  }

  // Handle Zoom Wheel
  function handleWheel(e: React.WheelEvent) {
    e.preventDefault();
    const zoomFactor = 0.05;
    const direction = e.deltaY < 0 ? 1 : -1;
    setZoom((prev) => {
      const nextZoom = prev + direction * zoomFactor;
      return Math.min(Math.max(nextZoom, 0.3), 2); // Zoom bounds 30% - 200%
    });
  }

  // Reparent Drag & Drop drop logic
  async function handleRootDrop(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    setRootDropping(false);
    setDragState({ draggingId: null });
    gripperActive.current = null;
    setIsGripperDrag(false);

    if (!draggedId || !onReparent) return;
    const dept = departments.find((d) => d.id === draggedId);
    if (dept && !dept.parentDepartmentId) return; // Already a root

    await onReparent(draggedId, null);
  }

  // Build list of visible nodes & SVG connecting paths
  interface VisibleNode {
    node: TreeNode;
    pos: Position;
  }
  interface VisibleLink {
    parentId: string;
    childId: string;
    parentPos: Position;
    childPos: Position;
  }

  const visibleNodes: VisibleNode[] = [];
  const visibleLinks: VisibleLink[] = [];

  function traverse(node: TreeNode) {
    const pos = nodePositions.get(node.id) || { x: 0, y: 0 };
    visibleNodes.push({ node, pos });

    const isCollapsed = collapsedNodes.has(node.id);
    if (!isCollapsed && node.children.length > 0) {
      node.children.forEach((child) => {
        const childPos = nodePositions.get(child.id) || { x: 0, y: 0 };
        visibleLinks.push({
          parentId: node.id,
          childId: child.id,
          parentPos: pos,
          childPos: childPos,
        });
        traverse(child);
      });
    }
  }
  roots.forEach((root) => traverse(root));

  // Auto-fit coordinates area (prevents canvas overlay clipping)
  const getCanvasDimensions = () => {
    let maxX = 1200;
    let maxY = 700;
    nodePositions.forEach((pos) => {
      if (pos.x + 350 > maxX) maxX = pos.x + 350;
      if (pos.y + 350 > maxY) maxY = pos.y + 350;
    });
    return { width: maxX, height: maxY };
  };
  const canvasSize = getCanvasDimensions();

  if (departments.length === 0) {
    return (
      <div className="dept-tree-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="8.5" y="14" width="7" height="7" rx="1" />
          <line x1="6.5" y1="10" x2="6.5" y2="14" />
          <line x1="17.5" y1="10" x2="17.5" y2="14" />
          <line x1="6.5" y1="14" x2="12" y2="14" />
          <line x1="12" y1="14" x2="17.5" y2="14" />
        </svg>
        <p>Chưa có phòng ban nào</p>
      </div>
    );
  }

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="dept-tree-root" ref={canvasRef}>
      {/* Pan & Drag Hint */}
      <div className="org-pan-hint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
        </svg>
        <span>Kéo card di chuyển • Kéo Gripper để đổi cấp • Cuộn chuột để zoom</span>
      </div>

      {/* Move to Root Drop Zone */}
      <div
        className={`org-root-dropzone${dragState.draggingId ? ' visible' : ''}${rootDropping ? ' active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setRootDropping(true);
        }}
        onDragLeave={() => setRootDropping(false)}
        onDrop={handleRootDrop}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 5v14M5 12h14" />
        </svg>
        Thả vào đây để đưa về cấp gốc (Root)
      </div>

      {/* Inner Canvas Scroll Area */}
      <div
        className="dept-tree-canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
        onWheel={handleWheel}
      >
        <div
          className="dept-tree-inner"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: `${canvasSize.width}px`,
            height: `${canvasSize.height}px`,
          }}
        >
          {/* SVG Overlay behind cards */}
          <svg className="org-connector-svg">
            {visibleLinks.map((link) => {
              const x1 = link.parentPos.x + 115; // Width is 230, so 115 centers it
              const y1 = link.parentPos.y + 142; // Card height is 142
              const x2 = link.childPos.x + 115;
              const y2 = link.childPos.y;
              const midY = (y1 + y2) / 2;
              const isPathHighlighted =
                hoveredNodeId === link.parentId || hoveredNodeId === link.childId;
              const pathData = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

              return (
                <path
                  key={`${link.parentId}-${link.childId}`}
                  d={pathData}
                  className={`org-connector-path${isPathHighlighted ? ' highlighted' : ''}`}
                />
              );
            })}
          </svg>

          {/* Render cards absolutely */}
          {visibleNodes.map(({ node, pos }) => {
            const initials = getInitials(node.departmentName, node.departmentCode);
            const palette = getPalette(node.departmentCode);
            const isDraggingReparent = dragState.draggingId === node.id;
            const isDraggingPos = activeDragNode === node.id;
            const isCollapsed = collapsedNodes.has(node.id);

            // HTML5 Reparent handlers
            const handleDragStart = (e: React.DragEvent) => {
              if (gripperActive.current !== node.id) {
                e.preventDefault();
                return;
              }
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', node.id);
              setDragState({ draggingId: node.id });
            };

            const handleDragEnd = () => {
              setDragState({ draggingId: null });
              gripperActive.current = null;
              setIsGripperDrag(false);
            };

            const handleDragOver = (e: React.DragEvent) => {
              if (!dragState.draggingId || dragState.draggingId === node.id) return;
              if (isDescendant(node.id, dragState.draggingId, departments)) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
            };

            const handleDrop = async (e: React.DragEvent) => {
              e.preventDefault();
              e.stopPropagation();
              const draggedId = e.dataTransfer.getData('text/plain');
              setDragState({ draggingId: null });
              gripperActive.current = null;
              setIsGripperDrag(false);

              if (!draggedId || draggedId === node.id || !onReparent) return;
              if (isDescendant(node.id, draggedId, departments)) return;

              await onReparent(draggedId, node.id);
            };

            const toggleCollapse = () => {
              setCollapsedNodes((prev) => {
                const next = new Set(prev);
                if (next.has(node.id)) {
                  next.delete(node.id);
                } else {
                  next.add(node.id);
                }
                return next;
              });
            };

            return (
              <div
                key={node.id}
                className={`org-card-wrapper${isDraggingPos ? ' dragging-node' : ''}`}
                style={{
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                }}
                draggable={isGripperDrag}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest('.org-drag-handle')) {
                    gripperActive.current = node.id;
                  } else {
                    gripperActive.current = null;
                    handleNodeMouseDown(e, node.id);
                  }
                }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <div
                  className={`org-card${!node.isActive ? ' inactive' : ''}${isDraggingReparent ? ' dragging' : ''}`}
                  style={{
                    '--dot-color': palette.dot,
                  } as React.CSSProperties}
                >
                  {/* Status indicator dot */}
                  <div className="org-status-dot" />

                  {/* Drag gripper icon (HTML5 Reparent handler) */}
                  {canEdit && (
                    <div
                      className="org-drag-handle"
                      title="Kéo Gripper này để gán cấp phòng cha"
                      onMouseDown={() => setIsGripperDrag(true)}
                      onMouseUp={() => setIsGripperDrag(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="9" cy="5" r="1" />
                        <circle cx="9" cy="12" r="1" />
                        <circle cx="9" cy="19" r="1" />
                        <circle cx="15" cy="5" r="1" />
                        <circle cx="15" cy="12" r="1" />
                        <circle cx="15" cy="19" r="1" />
                      </svg>
                    </div>
                  )}

                  {/* Card actions (edit/delete) */}
                  <div className="org-card-actions">
                    {canEdit && (
                      <button
                        className="org-action-btn"
                        onClick={() => onEdit(node)}
                        title="Chỉnh sửa"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="org-action-btn danger"
                        onClick={() => onDelete(node)}
                        title="Xóa"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14H6L5 6" />
                          <path d="M10 11v6M14 11v6" />
                          <path d="M9 6V4h6v2" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Initials Avatar badge */}
                  <div
                    className="org-avatar"
                    style={{
                      '--avatar-bg': palette.bg,
                      '--avatar-fg': palette.fg,
                      '--avatar-border': palette.border,
                    } as React.CSSProperties}
                  >
                    {initials}
                  </div>

                  {/* Details */}
                  <div className="org-name" title={node.departmentName}>
                    {node.departmentName}
                  </div>
                  <div className="org-role" title={node.managerName || 'Chưa gán trưởng phòng'}>
                    {node.managerName ? `Trưởng phòng: ${node.managerName}` : 'Chưa có trưởng phòng'}
                  </div>
                  <span className="org-code-badge">{node.departmentCode}</span>

                  {/* Card Footer */}
                  <div className="org-card-footer">
                    <div className="org-reports-count">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>{node.children.length} báo cáo</span>
                    </div>

                    <div className="org-footer-icon" title="Phòng ban">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expand / Collapse toggle at the bottom edge */}
                  {node.children.length > 0 && (
                    <button
                      className="org-toggle-btn"
                      onClick={toggleCollapse}
                      title={isCollapsed ? 'Mở rộng nhánh con' : 'Thu gọn nhánh con'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        {isCollapsed ? (
                          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
                        ) : (
                          <path d="M5 12h14" strokeLinecap="round" />
                        )}
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Control Box */}
      <div className="org-controls">
        <div className="org-zoom-indicator">{zoomPercent}%</div>
        <button
          type="button"
          className="org-control-btn"
          title="Phóng to"
          onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          className="org-control-btn"
          title="Thu nhỏ"
          onClick={() => setZoom((z) => Math.max(z - 0.1, 0.3))}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          className="org-control-btn"
          title="Tự động căn chỉnh & Căn giữa"
          onClick={handleAutoLayout}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
          </svg>
        </button>
        <button
          type="button"
          className="org-control-btn"
          title="Căn giữa màn hình hiện tại"
          onClick={centerTree}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
