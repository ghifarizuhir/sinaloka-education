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
    <div className={cn("p-4 border-t border-border flex items-center justify-between bg-muted/30", className)}>
      <p className="text-xs text-muted-foreground">
        {t('common.showing')} <span className="font-bold text-foreground">{from}</span> {t('common.to')} <span className="font-bold text-foreground">{to}</span> {t('common.of')} <span className="font-bold text-foreground">{total}</span> {t('common.results')}
      </p>
      <div className="flex items-center gap-2">
        <button disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)} className="p-1.5 disabled:opacity-30 hover:bg-accent rounded-lg transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-1">
          {pages.map(page => (
            <button key={page} onClick={() => onPageChange(page)} className={cn("w-8 h-8 text-xs font-bold rounded-lg transition-all", currentPage === page ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground")}>
              {page}
            </button>
          ))}
        </div>
        <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => onPageChange(currentPage + 1)} className="p-1.5 disabled:opacity-30 hover:bg-accent rounded-lg transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
