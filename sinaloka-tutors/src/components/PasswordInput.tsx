import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>;

export function PasswordInput(props: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className="w-full px-6 py-4 rounded-lg bg-surface-muted border border-surface-border focus:outline-none focus:border-brand transition-all text-white text-sm pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-subtle hover:text-surface-foreground/70 transition-colors"
      >
        {visible ? (
          <EyeOff className="w-4.5 h-4.5" />
        ) : (
          <Eye className="w-4.5 h-4.5" />
        )}
      </button>
    </div>
  );
}
