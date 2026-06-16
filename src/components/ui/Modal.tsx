import { useEffect, type MouseEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  size?: 'default' | 'wide' | 'xl';
  bodyClassName?: string;
}

export function Modal({ title, subtitle, open, onClose, children, wide, size, bodyClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function handleBackdropMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      e.preventDefault();
      onClose();
    }
  }

  const panelSize = size ?? (wide ? 'wide' : 'default');

  return createPortal(
    <div
      className="modal-overlay"
      onMouseDown={handleBackdropMouseDown}
      role="presentation"
    >
      <div
        className={`modal-panel modal-${panelSize}`}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div className="modal-header-text">
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p className="modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="icon-btn modal-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </div>
        <div className={`modal-body ${bodyClassName ?? ''}`}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}
