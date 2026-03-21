import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Card,
  Button,
  PageHeader,
  Skeleton,
  Modal,
  StatCard,
  Checkbox,
} from '../../components/UI';
import { cn, formatDate } from '../../lib/utils';
import {
  settlementsService,
  type Settlement,
} from '../../services/settlements';

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    TRANSFERRED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    TRANSFERRED: 'Transferred',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold',
        classes[status] ?? 'bg-zinc-100 text-zinc-600'
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Transfer Modal ───────────────────────────────────────────────────────────

interface TransferModalProps {
  settlement: Settlement | null;
  onClose: () => void;
}

function TransferModal({ settlement, onClose }: TransferModalProps) {
  const queryClient = useQueryClient();
  const [transferredAt, setTransferredAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: (id: string) =>
      settlementsService.markTransferred(id, {
        transferred_at: new Date(transferredAt).toISOString(),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success('Settlement ditandai sebagai transferred');
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-summary'] });
      onClose();
      setNotes('');
    },
    onError: () => {
      toast.error('Gagal memperbarui settlement');
    },
  });

  const handleSubmit = () => {
    if (!settlement || !transferredAt) return;
    mutation.mutate(settlement.id);
  };

  return (
    <Modal isOpen={!!settlement} onClose={onClose} title="Mark as Transferred">
      {settlement && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Institusi
              </p>
              <p className="text-sm dark:text-zinc-100">
                {settlement.institution?.name ?? settlement.institution_id}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">
                Jumlah Transfer
              </p>
              <p className="text-sm font-medium dark:text-zinc-100">
                Rp {Number(settlement.transfer_amount).toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              Tanggal Transfer <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={transferredAt}
              onChange={(e) => setTransferredAt(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
              Catatan
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan transfer (opsional)..."
              rows={3}
              className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Batal
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleSubmit}
              disabled={mutation.isPending || !transferredAt}
            >
              Konfirmasi Transfer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Batch Transfer Modal ─────────────────────────────────────────────────────

interface BatchTransferModalProps {
  selectedIds: string[];
  onClose: () => void;
}

function BatchTransferModal({ selectedIds, onClose }: BatchTransferModalProps) {
  const queryClient = useQueryClient();
  const [transferredAt, setTransferredAt] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      settlementsService.batchTransfer({
        settlement_ids: selectedIds,
        transferred_at: new Date(transferredAt).toISOString(),
        notes: notes || undefined,
      }),
    onSuccess: () => {
      toast.success(`${selectedIds.length} settlement berhasil ditransfer`);
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-summary'] });
      onClose();
      setNotes('');
    },
    onError: () => {
      toast.error('Gagal melakukan batch transfer');
    },
  });

  return (
    <Modal
      isOpen={selectedIds.length > 0}
      onClose={onClose}
      title={`Batch Transfer (${selectedIds.length} item)`}
    >
      <div className="space-y-4">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Transfer {selectedIds.length} settlement sekaligus ke institusi masing-masing.
        </p>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
            Tanggal Transfer <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={transferredAt}
            onChange={(e) => setTransferredAt(e.target.value)}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
          />
        </div>

        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-zinc-500 block mb-1">
            Catatan
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan transfer (opsional)..."
            rows={3}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Batal
          </Button>
          <Button
            size="sm"
            className="flex-1"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || !transferredAt}
          >
            Transfer Semua
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'TRANSFERRED', label: 'Transferred' },
];

const PAGE_LIMIT = 20;

export default function Settlements() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [transferTarget, setTransferTarget] = useState<Settlement | null>(null);
  const [batchModalOpen, setBatchModalOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['settlement-summary'],
    queryFn: () => settlementsService.getSettlementSummary(),
  });

  const { data: settlementsData, isLoading: listLoading } = useQuery({
    queryKey: ['settlements', statusFilter, page],
    queryFn: () =>
      settlementsService.getSettlements({
        status: statusFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      }),
  });

  const items: Settlement[] = settlementsData?.data ?? [];
  const total = settlementsData?.meta?.total ?? 0;
  const totalPages = settlementsData?.meta?.totalPages ?? 1;

  const pendingItems = items.filter((i) => i.status === 'PENDING');
  const allPendingSelected =
    pendingItems.length > 0 &&
    pendingItems.every((i) => selectedIds.includes(i.id));

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pendingItems.map((i) => i.id).includes(id)));
    } else {
      setSelectedIds((prev) => [
        ...prev,
        ...pendingItems.map((i) => i.id).filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settlements"
        subtitle="Kelola pembayaran QRIS yang perlu ditransfer ke institusi"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {summaryLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Pending"
              value={`Rp ${(summary?.totals?.total_pending ?? 0).toLocaleString('id-ID')}`}
            />
            <StatCard
              label="Total Transferred"
              value={`Rp ${(summary?.totals?.total_transferred ?? 0).toLocaleString('id-ID')}`}
            />
            <StatCard
              label="Total Platform Fee"
              value={`Rp ${(summary?.totals?.total_platform_cost ?? 0).toLocaleString('id-ID')}`}
            />
          </>
        )}
      </div>

      {/* Table Card */}
      <Card className="!p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 py-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(e.target.value)}
              className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {total > 0 && (
              <span className="text-sm text-zinc-400 dark:text-zinc-500">
                {total} item
              </span>
            )}
          </div>

          {selectedIds.length > 0 && (
            <Button
              size="sm"
              onClick={() => setBatchModalOpen(true)}
            >
              Transfer {selectedIds.length} Item
            </Button>
          )}
        </div>

        {/* Table */}
        {listLoading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              Tidak ada settlement ditemukan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="p-4 w-10">
                    <Checkbox
                      checked={allPendingSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Tanggal
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Institusi
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Siswa
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Jumlah
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Fee
                  </th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Transfer
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Status
                  </th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 p-4">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                  >
                    <td className="p-4">
                      {item.status === 'PENDING' ? (
                        <Checkbox
                          checked={selectedIds.includes(item.id)}
                          onChange={() => toggleSelect(item.id)}
                        />
                      ) : (
                        <div className="w-4 h-4" />
                      )}
                    </td>
                    <td className="p-4 text-sm text-zinc-500">
                      {formatDate(item.created_at, 'id')}
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-sm dark:text-zinc-100">
                        {item.institution?.name ?? item.institution_id}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-zinc-500">
                      {item.payment?.student?.name ?? '—'}
                    </td>
                    <td className="p-4 text-sm text-right dark:text-zinc-100">
                      Rp {Number(item.gross_amount).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-sm text-right text-zinc-500">
                      Rp {Number(item.platform_cost).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4 text-sm text-right font-medium dark:text-zinc-100">
                      Rp {Number(item.transfer_amount).toLocaleString('id-ID')}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="p-4">
                      {item.status === 'PENDING' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTransferTarget(item)}
                        >
                          Transfer
                        </Button>
                      ) : (
                        <span className="text-xs text-zinc-400">
                          {item.transferred_at
                            ? formatDate(item.transferred_at, 'id')
                            : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              Halaman {page} dari {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Berikutnya
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <TransferModal
        settlement={transferTarget}
        onClose={() => setTransferTarget(null)}
      />
      {batchModalOpen && (
        <BatchTransferModal
          selectedIds={selectedIds}
          onClose={() => {
            setBatchModalOpen(false);
            setSelectedIds([]);
          }}
        />
      )}
    </div>
  );
}
