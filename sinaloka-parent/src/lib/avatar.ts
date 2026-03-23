const AVATAR_COLORS = [
  'bg-primary/15 text-primary',
  'bg-success-muted text-success',
  'bg-warning-muted text-warning',
  'bg-info-muted text-info',
  'bg-destructive-muted text-destructive',
];

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
