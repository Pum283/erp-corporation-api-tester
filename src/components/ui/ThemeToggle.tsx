import { useTheme } from '../../context/ThemeContext';
import { IconMoon, IconSun } from './Icons';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={theme === 'light' ? 'Bật chế độ tối' : 'Bật chế độ sáng'}
      title={theme === 'light' ? 'Chế độ tối' : 'Chế độ sáng'}
    >
      {theme === 'light' ? <IconMoon /> : <IconSun />}
    </button>
  );
}
