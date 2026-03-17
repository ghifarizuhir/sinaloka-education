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
        className="w-full px-6 py-4 rounded-lg bg-zinc-900 border border-zinc-800 focus:outline-none focus:border-lime-400 transition-all text-white text-sm pr-12"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
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
