import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useOverlayClose } from './use-overlay-close';

export function Drawer({ isOpen, onClose, title, children, titleId = 'drawer-title' }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, titleId?: string }) {
  useOverlayClose(isOpen, onClose);
  return (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex justify-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        />
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="relative w-full max-w-md bg-card h-full shadow-2xl overflow-hidden flex flex-col border-l border-border"
        >
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h3 id={titleId} className="text-xl font-bold text-foreground">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground"
            >
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {children}
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}
