import { useTranslation } from 'react-i18next';
import { MessageCircle } from 'lucide-react';

interface WhatsAppFABProps {
  number: string | null;
}

function normalizeWhatsAppNumber(number: string): string {
  // Strip all non-digit characters
  const digits = number.replace(/\D/g, '');
  // If starts with 0, replace with 62 (Indonesia country code)
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function WhatsAppFAB({ number }: WhatsAppFABProps) {
  const { t } = useTranslation();

  if (!number) return null;

  const normalized = normalizeWhatsAppNumber(number);

  return (
    <a
      href={`https://wa.me/${normalized}`}
      target="_blank"
      rel="noopener noreferrer"
      title={t('landingPage.whatsappChat')}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/30 transition-colors"
    >
      <MessageCircle size={24} />
    </a>
  );
}
