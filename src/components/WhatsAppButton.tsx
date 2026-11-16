import { MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function WhatsAppButton() {
  const { settings } = useStore();
  const raw = (settings?.whatsapp_number || '+212661000000').replace(/[^0-9]/g, '');
  const href = `https://wa.me/${raw}?text=${encodeURIComponent(
    'Bonjour CasaTech, je souhaite des informations sur un produit.'
  )}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter CasaTech sur WhatsApp"
      className="fixed bottom-4 right-4 z-30 h-11 px-4 rounded-full bg-[#15803D] hover:bg-[#166534] text-white shadow-lg flex items-center gap-2 text-sm font-medium transition-transform hover:scale-[1.03]"
    >
      <MessageCircle className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline whitespace-nowrap">WhatsApp</span>
    </a>
  );
}
