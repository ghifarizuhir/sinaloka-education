import React from 'react';
import { Modal, Input, Label, Button, DatePicker } from '../../components/ui';
import { Spinner } from '../../components/ui/spinner';

export function YearFormModal({
  isOpen,
  onClose,
  editing,
  name,
  setName,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  editing: boolean;
  name: string;
  setName: (v: string) => void;
  startDate: string;
  setStartDate: (v: string) => void;
  endDate: string;
  setEndDate: (v: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? 'Edit Tahun Ajaran' : 'Tambah Tahun Ajaran'}
    >
      <div className="space-y-4">
        <div>
          <Label htmlFor="year-name">Nama</Label>
          <Input
            id="year-name"
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Contoh: 2024/2025"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="year-start">Tanggal Mulai</Label>
            <DatePicker value={startDate} onChange={setStartDate} />
          </div>
          <div>
            <Label htmlFor="year-end">Tanggal Selesai</Label>
            <DatePicker value={endDate} onChange={setEndDate} />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Batal
          </Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting && <Spinner size="sm" />}
            {editing ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
