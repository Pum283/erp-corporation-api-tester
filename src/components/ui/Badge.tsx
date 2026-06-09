interface BadgeProps {
  active?: boolean;
  children: string;
}

export function Badge({ active = true, children }: BadgeProps) {
  return <span className={`badge ${active ? 'badge-active' : 'badge-inactive'}`}>{children}</span>;
}
