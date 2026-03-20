import { AnimatePresence, motion } from 'motion/react';
import { Button } from './button';
import { useOverlayClose } from './use-overlay-close';

export interface FieldChange {
  label: string;
  type: 'scalar' | 'array' | 'secret';
  oldValue?: string;
  newValue?: string;
  added?: string[];
  removed?: string[];
}

interface ConfirmChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  changes: FieldChange[];
  isLoading?: boolean;
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmChangesModal({
  isOpen,
  onClose,
  onConfirm,
  changes,
  isLoading = false,
  title = 'Konfirmasi Perubahan',
  confirmLabel = 'Konfirmasi & Simpan',
  cancelLabel = 'Batal',
}: ConfirmChangesModalProps) {
  useOverlayClose(isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-changes-title"
            className="relative bg-card rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col border border-border"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
          >
            <div className="p-6 border-b border-border">
              <h2 id="confirm-changes-title" className="text-lg font-bold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Periksa perubahan berikut sebelum menyimpan:
              </p>
            </div>

            <div className="p-6 overflow-y-auto space-y-3">
              {changes.map((change, i) => (
                <div
                  key={change.label}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {change.label}
                  </p>

                  {change.type === 'scalar' && (
                    <p className="text-sm text-foreground">
                      <span className="text-red-500 line-through">{change.oldValue}</span>
                      {' → '}
                      <span className="text-emerald-600 font-medium">{change.newValue}</span>
                    </p>
                  )}

                  {change.type === 'secret' && (
                    <p className="text-sm text-amber-600 font-medium">Diperbarui</p>
                  )}

                  {change.type === 'array' && (
                    <div className="space-y-1">
                      {change.added?.map((item) => (
                        <p key={item} className="text-sm text-emerald-600">+ {item}</p>
                      ))}
                      {change.removed?.map((item) => (
                        <p key={item} className="text-sm text-red-500">- {item}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-border flex items-center justify-end gap-3">
              <Button variant="outline" onClick={onClose} disabled={isLoading}>
                {cancelLabel}
              </Button>
              <Button onClick={onConfirm} disabled={isLoading}>
                {isLoading ? 'Menyimpan...' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
