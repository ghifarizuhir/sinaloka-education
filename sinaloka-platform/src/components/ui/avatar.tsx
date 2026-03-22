import { useState } from 'react';
import { cn } from '../../lib/utils';

export const Avatar = ({ name, src, size = 'md', className }: { name: string; src?: string | null; size?: 'sm' | 'md' | 'lg'; className?: string }) => {
  const [imgError, setImgError] = useState(false);
  const initial = name.split(' ').pop()?.charAt(0)?.toUpperCase() ?? '?';
  const sizes = {
    sm: 'w-8 h-8 rounded-full text-xs bg-muted text-muted-foreground',
    md: 'w-10 h-10 rounded-xl text-sm bg-primary text-primary-foreground',
    lg: 'w-16 h-16 rounded-2xl text-2xl shadow-lg bg-primary text-primary-foreground',
  };

  if (src && !imgError) {
    return (
      <img
        src={src.startsWith('http') ? src : `${import.meta.env.VITE_API_URL}/api/uploads/${src}`}
        alt={name}
        onError={() => setImgError(true)}
        className={cn("object-cover flex-shrink-0", sizes[size], className)}
      />
    );
  }

  return (
    <div className={cn("flex items-center justify-center font-bold flex-shrink-0", sizes[size], className)}>
      {initial}
    </div>
  );
};
