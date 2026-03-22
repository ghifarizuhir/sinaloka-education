import React from 'react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { useOverlayClose } from './use-overlay-close';

export function Modal({ isOpen, onClose, title, children, className, titleId = 'modal-title' }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, className?: string, titleId?: string }) {
  useOverlayClose(isOpen, onClose);
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={cn("relative w-full max-w-lg bg-card rounded-2xl shadow-2xl overflow-hidden border border-border", className)}
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
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
