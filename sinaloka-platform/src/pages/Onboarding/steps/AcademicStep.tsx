import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { GraduationCap, X, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { settingsService } from '@/src/services/settings.service';
import { useCreateSubject, useDeleteSubject, useSubjects } from '@/src/hooks/useSubjects';
import { cn } from '@/src/lib/utils';

interface AcademicStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

const DAYS = [
  { num: 1, label: 'Sen' },
  { num: 2, label: 'Sel' },
  { num: 3, label: 'Rab' },
  { num: 4, label: 'Kam' },
  { num: 5, label: 'Jum' },
  { num: 6, label: 'Sab' },
  { num: 0, label: 'Min' },
];

export function AcademicStep({ onNext, onBack, onSkip }: AcademicStepProps) {
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);
  const [newRoom, setNewRoom] = useState('');
  const [newSubject, setNewSubject] = useState('');

  const { data: subjects = [] } = useSubjects();
  const createSubject = useCreateSubject();
  const deleteSubject = useDeleteSubject();

  const toggleDay = (day: number) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addRoom = () => {
    const name = newRoom.trim();
    if (!name) return;
    if (rooms.some((r) => r.name.toLowerCase() === name.toLowerCase())) return;
    setRooms((prev) => [...prev, { id: crypto.randomUUID(), name }]);
    setNewRoom('');
  };

  const removeRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  const addSubject = () => {
    const name = newSubject.trim();
    if (!name) return;
    if (subjects.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    createSubject.mutate(name, {
      onSuccess: () => setNewSubject(''),
      onError: () => toast.error('Gagal menambah mata pelajaran'),
    });
  };

  const saveMutation = useMutation({
    mutationFn: () =>
      settingsService.updateAcademic({
        working_days: workingDays,
        rooms: rooms.map((r) => ({
          id: r.id,
          name: r.name,
          type: 'Classroom' as const,
          capacity: null,
          status: 'Available' as const,
        })),
      }),
    onSuccess: () => {
      toast.success('Pengaturan akademik disimpan');
      onNext();
    },
    onError: () => {
      toast.error('Gagal menyimpan pengaturan');
    },
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <GraduationCap className="w-6 h-6 text-zinc-400" />
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Pengaturan Akademik
        </h2>
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
        Data ini dibutuhkan saat membuat kelas dan jadwal. Anda bisa menambah atau mengubahnya nanti di Settings.
      </p>

      <div className="max-w-lg space-y-6">
        {/* Working Days */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Hari Operasional
          </label>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            Hari dimana institusi Anda menerima jadwal belajar
          </p>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day) => {
              const isActive = workingDays.includes(day.num);
              return (
                <button
                  key={day.num}
                  type="button"
                  onClick={() => toggleDay(day.num)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs font-semibold border transition-all',
                    isActive
                      ? 'border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:border-zinc-400',
                  )}
                >
                  {day.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Rooms */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Ruangan
          </label>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            Tempat belajar yang tersedia. Digunakan saat menjadwalkan kelas.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRoom())}
              placeholder="Ruang A1"
              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={addRoom}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Plus size={16} />
            </button>
          </div>
          {rooms.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {rooms.map((room) => (
                <span
                  key={room.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  {room.name}
                  <button type="button" onClick={() => removeRoom(room.id)} className="text-zinc-400 hover:text-zinc-600">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Subjects */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Mata Pelajaran
          </label>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-3">
            Mata pelajaran yang diajarkan. Digunakan saat membuat kelas baru.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubject())}
              placeholder="Matematika"
              className="flex-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm dark:text-zinc-100"
            />
            <button
              type="button"
              onClick={addSubject}
              disabled={createSubject.isPending}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              <Plus size={16} />
            </button>
          </div>
          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {subjects.map((subject) => (
                <span
                  key={subject.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  {subject.name}
                  <button
                    type="button"
                    onClick={() => deleteSubject.mutate(subject.id)}
                    disabled={deleteSubject.isPending}
                    className="text-zinc-400 hover:text-zinc-600 disabled:opacity-50"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            Kembali
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            Lewati
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="px-6 py-2.5 rounded-lg font-medium text-sm bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Menyimpan...' : 'Lanjut'}
          </button>
        </div>
      </div>
    </div>
  );
}
