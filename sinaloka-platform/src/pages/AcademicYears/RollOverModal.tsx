import React from 'react';
import { Modal, Button, Label, Checkbox } from '../../components/ui';
import { Spinner } from '../../components/ui/spinner';
import type { Semester, SemesterDetail } from '@/src/types/academic-year';

export function RollOverModal({
  isOpen,
  onClose,
  targetSemester,
  allSemesters,
  sourceId,
  setSourceId,
  sourceSemesterDetail,
  selectedClassIds,
  toggleClass,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  targetSemester: Semester | null;
  allSemesters: (Semester & { yearName: string })[];
  sourceId: string;
  setSourceId: (v: string) => void;
  sourceSemesterDetail: SemesterDetail | undefined;
  selectedClassIds: string[];
  toggleClass: (id: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  // Exclude the target semester from source options
  const sourceOptions = allSemesters.filter(
    (s) => s.id !== targetSemester?.id
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Roll-over Kelas"
      className="max-w-xl"
    >
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Salin kelas dari semester lain ke{' '}
          <span className="font-semibold text-foreground">
            {targetSemester?.name}
          </span>
          .
        </p>

        <div>
          <Label htmlFor="roll-source">Semester Sumber</Label>
          <select
            id="roll-source"
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Pilih semester sumber...</option>
            {sourceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.yearName} — {s.name}
              </option>
            ))}
          </select>
        </div>

        {sourceId && sourceSemesterDetail && (
          <div>
            <Label>Kelas yang akan disalin</Label>
            {sourceSemesterDetail.classes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Tidak ada kelas di semester sumber.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto border border-border rounded-xl divide-y divide-border">
                {sourceSemesterDetail.classes.map((cls) => (
                  <label
                    key={cls.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-accent/50 cursor-pointer"
                  >
                    <Checkbox
                      checked={
                        selectedClassIds.length === 0 || selectedClassIds.includes(cls.id)
                      }
                      onChange={() => toggleClass(cls.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{cls.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {cls.subject.name} &middot; {cls.tutor.user.name}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {selectedClassIds.length === 0
                ? 'Semua kelas akan disalin'
                : `${selectedClassIds.length} kelas dipilih`}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !sourceId}
          >
            {isSubmitting && <Spinner size="sm" />}
            Roll-over
          </Button>
        </div>
      </div>
    </Modal>
  );
}
