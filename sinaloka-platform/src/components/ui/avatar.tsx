import { cn } from '../../lib/utils';

export const Avatar = ({ name, size = 'md', className }: { name: string; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const initial = name.split(' ').pop()?.charAt(0)?.toUpperCase() ?? '?';
  const sizes = {
    sm: 'w-8 h-8 rounded-full text-xs bg-muted text-muted-foreground',
    md: 'w-10 h-10 rounded-xl text-sm bg-primary text-primary-foreground',
    lg: 'w-16 h-16 rounded-2xl text-2xl shadow-lg bg-primary text-primary-foreground',
  };
  return (
    <div className={cn("flex items-center justify-center font-bold", sizes[size], className)}>
      {initial}
    </div>
  );
};
