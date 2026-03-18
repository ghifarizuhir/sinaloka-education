import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage, totalPages, total, itemsPerPage, onPageChange, className }: {
  currentPage: number;
  totalPages: number;
  total: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  className?: string;
}) => {
  const { t } = useTranslation();
  const from = Math.min((currentPage - 1) * itemsPerPage + 1, total);
  const to = Math.min(currentPage * itemsPerPage, total);
  const maxButtons = 5;
  const startPage = Math.max(1, Math.min(currentPage - Math.floor(maxButtons / 2), totalPages - maxButtons + 1));
  const pages = Array.from({ length: Math.min(maxButtons, totalPages) }, (_, i) => startPage + i);

  if (totalPages <= 1 && total <= itemsPerPage) return null;

  return (
    <div className={cn("p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30", className)}>
      <p className="text-xs text-zinc-500">
        {t('common.showing')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{from}</span> {t('common.to')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{to}</span> {t('common.of')} <span className="font-bold text-zinc-900 dark:text-zinc-100">{total}</span> {t('common.results')}
      </p>
      <div className="flex items-center gap-2">
        <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          {pages.map(page => (
            <button key={page} onClick={() => onPageChange(page)} className={cn("w-8 h-8 text-xs font-bold rounded-lg transition-all", currentPage === page ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500")}>
              {page}
            </button>
          ))}
        </div>
        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => onPageChange(currentPage + 1)} className="p-1.5 disabled:opacity-30 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
