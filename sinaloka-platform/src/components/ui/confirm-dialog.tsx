import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useOverlayClose } from './use-overlay-close';
import { Spinner } from './spinner';

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, confirmLabel, cancelLabel, variant = 'danger', isLoading }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  isLoading?: boolean;
}) {
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
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
          className="relative w-full max-w-sm bg-card rounded-2xl shadow-2xl overflow-hidden border border-border"
        >
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <h3 id="confirm-dialog-title" className="text-lg font-bold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
              >
                {cancelLabel ?? 'Cancel'}
              </button>
              <button
                onClick={onConfirm}
                disabled={isLoading}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2",
                  variant === 'danger'
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isLoading && <Spinner size="sm" />}
                {confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
  );
}
