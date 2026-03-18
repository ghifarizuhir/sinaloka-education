import React from 'react';
import { motion } from 'motion/react';
import { Wallet, CheckCircle2, Clock, Eye, Download } from 'lucide-react';
import { Payout } from '../types';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '../lib/utils';

interface PayoutCardProps {
  payout: Payout;
  onViewProof: (url: string) => void;
}

export const PayoutCard: React.FC<PayoutCardProps> = ({ payout, onViewProof }) => {
  const isPaid = payout.status === 'paid';
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-surface-muted border border-surface-border rounded-xl p-5 mb-4"
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center",
            isPaid ? "bg-brand-muted text-brand" : "bg-orange-400/10 text-orange-400"
          )}>
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-white font-bold text-sm">{payout.description}</h4>
            <p className="text-subtle text-[10px] font-bold uppercase tracking-wider">
              {format(new Date(payout.date), 'd MMM yyyy', { locale: id })}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-white font-bold tracking-tight text-lg">
            Rp {payout.amount.toLocaleString('id-ID')}
          </p>
          <div className={cn(
            "inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider",
            isPaid ? "text-brand" : "text-orange-400"
          )}>
            {isPaid ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            {payout.status}
          </div>
        </div>
      </div>

      {isPaid && payout.proofUrl && (
        <button 
          onClick={() => onViewProof(payout.proofUrl!)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-elevated text-white text-xs font-bold uppercase tracking-wider hover:bg-surface-elevated/80 transition-colors"
        >
          <Eye className="w-4 h-4" />
          Lihat Bukti Transfer
        </button>
      )}
    </motion.div>
  );
};
