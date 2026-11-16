import { useEffect, useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function ContactPage() {
  const { settings, notify } = useStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    document.title = 'Contact — CasaTech Casablanca';
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, email, phone, subject, message }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        notify(data.message || 'Message envoyé.');
        setFullName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
      } else {
        notify(data.error || 'Erreur lors de l’envoi.', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 space-y-6">
          <h1 className="font-display text-3xl font-bold text-[#0B192C]">Contacter CasaTech</h1>
          <p className="text-sm text-[#475569] leading-relaxed">
            Notre équipe technique et commerciale à Casablanca vous accompagne pour vos devis
            entreprises, conseils produits ou suivis de commande.
          </p>

          <div className="space-y-4 pt-2 text-sm text-[#334155]">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#0B192C]">Showroom Casablanca</div>
                <div className="text-[#64748B]">{settings?.store_address}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#0B192C]">Téléphone & WhatsApp</div>
                <div className="text-[#64748B] font-mono">{settings?.contact_phone}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-[#1D4ED8] shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-[#0B192C]">E-mail</div>
                <div className="text-[#64748B]">{settings?.contact_email}</div>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-4"
        >
          <h2 className="font-display text-xl font-bold text-[#0B192C]">Envoyer un message</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Nom complet *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">E-mail *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Objet *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Message *</label>
            <textarea
              required
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 rounded-lg border border-[#CBD5E1] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={sending}
            className="h-11 px-6 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold inline-flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            <span>{sending ? 'Envoi...' : 'Envoyer le message'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

export function LegalPage({ type }: { type: 'terms' | 'privacy' }) {
  const { settings } = useStore();
  const title = type === 'terms' ? 'Conditions Générales de Vente' : 'Politique de Confidentialité';
  const body = type === 'terms' ? settings?.terms_content : settings?.privacy_content;

  useEffect(() => {
    document.title = `${title} — CasaTech`;
  }, [title]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-4">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B192C]">{title}</h1>
        <p className="text-sm text-[#334155] leading-relaxed whitespace-pre-line">{body}</p>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  const { navigate } = useStore();
  useEffect(() => {
    document.title = 'Page introuvable (404) — CasaTech';
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-5">
      <div className="font-mono text-5xl font-bold text-[#1D4ED8]">404</div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B192C]">Page introuvable</h1>
      <p className="text-sm text-[#475569]">
        La page que vous recherchez n&apos;existe pas ou a été déplacée.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-5 py-2.5 rounded-lg bg-[#0B192C] text-white text-sm font-semibold"
        >
          Retour à l&apos;accueil
        </button>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="px-5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm font-semibold text-[#0B192C]"
        >
          Voir la boutique
        </button>
      </div>
    </div>
  );
}
