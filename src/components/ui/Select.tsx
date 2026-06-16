import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown } from './Icons';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  className?: string;
  size?: 'default' | 'compact';
  'aria-label'?: string;
}

interface MenuPosition {
  top: number;
  left: number;
  width: number;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = '— Chọn —',
  required,
  disabled,
  id,
  className,
  size = 'default',
  'aria-label': ariaLabel,
}: SelectProps) {
  const autoId = useId();
  const listboxId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<MenuPosition>({ top: 0, left: 0, width: 0 });

  const stringValue = String(value);
  const selected = options.find((o) => String(o.value) === stringValue);
  const enabledOptions = options.filter((o) => !o.disabled);

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu?.offsetHeight ?? 220;
    const gap = 6;
    const padding = 8;
    const spaceBelow = window.innerHeight - rect.bottom - padding;
    const spaceAbove = rect.top - padding;
    const openUp = spaceBelow < Math.min(menuHeight, 240) && spaceAbove > spaceBelow;

    setMenuStyle({
      top: openUp ? rect.top - menuHeight - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const close = useCallback((blurTrigger = false) => {
    setOpen(false);
    setHighlightIndex(-1);
    if (blurTrigger) {
      triggerRef.current?.blur();
    }
  }, []);

  const selectOption = useCallback(
    (option: SelectOption) => {
      if (option.disabled) return;
      onChange(String(option.value));
      close(true);
    },
    [close, onChange],
  );

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(frame);
  }, [open, options.length, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      close(true);
    }

    function handleReposition() {
      updatePosition();
    }

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [close, open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = enabledOptions.findIndex((o) => String(o.value) === stringValue);
    setHighlightIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [enabledOptions, open, stringValue]);

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      close(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) => {
        const next = i + 1;
        return next >= enabledOptions.length ? 0 : next;
      });
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => {
        const next = i - 1;
        return next < 0 ? enabledOptions.length - 1 : next;
      });
      return;
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const option = enabledOptions[highlightIndex];
      if (option) selectOption(option);
    }
  }

  const rootClass = [
    'ui-select',
    size === 'compact' ? 'ui-select-compact' : '',
    open ? 'ui-select-open' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        id={listboxId}
        className="ui-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleKeyDown}
      >
        <span className={`ui-select-value${selected ? '' : ' is-placeholder'}`}>
          {selected?.label ?? placeholder}
        </span>
        <IconChevronDown className="ui-select-chevron" width={16} height={16} />
      </button>

      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={stringValue}
          onChange={() => {}}
          className="ui-select-validity"
        />
      )}

      {open &&
        createPortal(
          <ul
            ref={menuRef}
            role="listbox"
            aria-labelledby={listboxId}
            className="ui-select-menu"
            style={{
              top: menuStyle.top,
              left: menuStyle.left,
              width: menuStyle.width,
              minWidth: menuStyle.width,
            }}
          >
            {options.map((option) => {
              const isSelected = String(option.value) === stringValue;
              const enabledIndex = enabledOptions.indexOf(option);
              const isHighlighted = enabledIndex === highlightIndex;

              return (
                <li key={String(option.value)} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={option.disabled}
                    className={[
                      'ui-select-option',
                      isSelected ? 'is-selected' : '',
                      isHighlighted ? 'is-highlighted' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => {
                      if (!option.disabled && enabledIndex >= 0) {
                        setHighlightIndex(enabledIndex);
                      }
                    }}
                    onClick={() => selectOption(option)}
                  >
                    {option.label}
                  </button>
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </div>
  );
}
