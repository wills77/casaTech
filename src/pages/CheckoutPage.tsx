import { useEffect, useState } from 'react';
import { CheckCircle2, CreditCard, Lock, MapPin, ShieldCheck, Truck } from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { useStore } from '../context/StoreContext';
import type { Address, Order } from '../types';
import { formatMad } from '../utils/format';

interface ServerQuote {
  subtotalMad: number;
  discountMad: number;
  appliedPromoCode: string | null;
  shippingFeeMad: number;
  totalMad: number;
}

export function CheckoutPage() {
  const { cart, user, settings, clearCart, navigate, notify } = useStore();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [city, setCity] = useState('Casablanca');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<
    'Livraison à domicile à Casablanca' | 'Livraison Maroc' | 'Retrait en boutique'
  >('Livraison à domicile à Casablanca');
  const [paymentMethod] = useState<'COD'>('COD');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState('');
  const [quote, setQuote] = useState<ServerQuote | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    document.title = 'Commander — CasaTech Maroc';
    if (user) {
      setFullName((v) => v || user.full_name);
      setPhone((v) => v || user.phone);
      setEmail((v) => v || user.email);
      fetch('/api/account/addresses')
        .then((r) => (r.ok ? r.json() : []))
        .then((addrs: Address[]) => {
          const def = addrs.find((a) => a.is_default === 1) || addrs[0];
          if (def) {
            setCity(def.city);
            setNeighborhood(def.neighborhood);
            setAddress(def.street_address);
            if (!def.city.toLowerCase().includes('casablanca')) {
              setDeliveryMethod('Livraison Maroc');
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    if (cart.length === 0) return;
    const fetchQuote = async () => {
      try {
        const res = await fetch('/api/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: cart.map((i) => ({
              product_id: i.product_id,
              quantity: i.quantity,
              variant_label: i.variant_label,
            })),
            promo_code: appliedPromo || undefined,
            delivery_method: deliveryMethod,
            city,
          }),
        });
        if (res.ok) {
          setQuote((await res.json()) as ServerQuote);
        }
      } catch {
        // ignore
      }
    };
    fetchQuote();
  }, [cart, appliedPromo, deliveryMethod, city]);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedPromo(promoInput.trim().toUpperCase());
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: fullName,
          customer_phone: phone,
          customer_email: email,
          city,
          neighborhood,
          shipping_address: deliveryMethod === 'Retrait en boutique' ? settings?.store_address || 'Boutique Casablanca' : address,
          notes,
          delivery_method: deliveryMethod,
          payment_method: paymentMethod,
          promo_code: appliedPromo || undefined,
          items: cart.map((i) => ({
            product_id: i.product_id,
            quantity: i.quantity,
            variant_label: i.variant_label,
          })),
        }),
      });
      const data = (await res.json()) as { order?: Order; items?: Order['items']; error?: string };
      if (!res.ok || !data.order) {
        notify(data.error || 'Impossible de valider la commande.', 'error');
        return;
      }
      setConfirmedOrder({ ...data.order, items: data.items });
      clearCart();
      notify(`Commande ${data.order.order_number} enregistrée.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#15803D] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-[#15803D]">
                Commande enregistrée
              </div>
              <h1 className="font-display text-2xl font-bold text-[#0B192C] mt-1">
                Merci {confirmedOrder.customer_name} !
              </h1>
              <p className="text-sm text-[#475569] mt-1">
                Votre numéro de commande unique est{' '}
                <strong className="font-mono text-[#0B192C]">{confirmedOrder.order_number}</strong>.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <div className="text-[#64748B]">Mode de livraison</div>
              <div className="font-semibold text-[#0F172A] mt-0.5">{confirmedOrder.delivery_method}</div>
            </div>
            <div>
              <div className="text-[#64748B]">Paiement</div>
              <div className="font-semibold text-[#0F172A] mt-0.5">Paiement à la livraison (COD)</div>
            </div>
            <div>
              <div className="text-[#64748B]">Total confirmé</div>
              <div className="font-mono font-bold text-[#0B192C] text-sm mt-0.5">
                {formatMad(confirmedOrder.total_mad)}
              </div>
            </div>
          </div>

          {confirmedOrder.items && (
            <div className="divide-y divide-[#F1F5F9] border-t border-[#E2E8F0]">
              {confirmedOrder.items.map((it) => (
                <div key={it.id} className="py-3 flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-[#0F172A]">
                      {it.product_name} × {it.quantity}
                    </div>
                    {it.variant_label && <div className="text-xs text-[#64748B]">{it.variant_label}</div>}
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-[#0B192C]">
                    {formatMad(it.line_total_mad)}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate('/boutique')}
              className="px-5 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold hover:bg-[#1E40AF]"
            >
              Continuer mes achats
            </button>
            {user && (
              <button
                type="button"
                onClick={() => navigate('/compte')}
                className="px-5 py-2.5 rounded-lg border border-[#CBD5E1] text-sm font-semibold text-[#0B192C] hover:bg-[#F8FAFC]"
              >
                Suivre mes commandes
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0B192C]">Votre panier est vide</h1>
        <p className="text-sm text-[#64748B]">
          Ajoutez des articles depuis la boutique avant de procéder au paiement.
        </p>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="px-6 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold"
        >
          Explorer le catalogue
        </button>
      </div>
    );
  }

  const zones = settings?.delivery_zones || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B192C] mb-8">
        Finaliser la commande
      </h1>

      <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B192C]">1. Coordonnées client</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Nom complet *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex. Youssef El Amrani"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6XX XX XX XX"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#334155] mb-1">Adresse e-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="client@exemple.ma"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B192C]">2. Mode de livraison</h2>
            <div className="space-y-2.5">
              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-[#CBD5E1] cursor-pointer hover:border-[#1D4ED8]">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={deliveryMethod === 'Livraison à domicile à Casablanca'}
                  onChange={() => {
                    setDeliveryMethod('Livraison à domicile à Casablanca');
                    setCity('Casablanca');
                  }}
                  className="mt-1 text-[#1D4ED8]"
                />
                <div className="flex-1 text-sm">
                  <div className="font-semibold text-[#0B192C] flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#1D4ED8]" />
                    <span>Livraison à domicile à Casablanca (24h)</span>
                  </div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    {formatMad(settings?.casablanca_shipping_fee || 30)} — Offert dès{' '}
                    {formatMad(settings?.free_shipping_threshold || 2500)}.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-[#CBD5E1] cursor-pointer hover:border-[#1D4ED8]">
                <input
                  type="radio"
                  name="deliveryMethod"
                  checked={deliveryMethod === 'Livraison Maroc'}
                  onChange={() => {
                    setDeliveryMethod('Livraison Maroc');
                    if (city === 'Casablanca') setCity('Rabat / Salé');
                  }}
                  className="mt-1 text-[#1D4ED8]"
                />
                <div className="flex-1 text-sm">
                  <div className="font-semibold text-[#0B192C]">Livraison autres villes du Maroc</div>
                  <p className="text-xs text-[#64748B] mt-0.5">
                    Rabat, Marrakech, Tanger, Agadir, Fès, Meknès, Oujda (24–72h).
                  </p>
                </div>
              </label>

              {settings?.pickup_enabled && (
                <label className="flex items-start gap-3 p-3.5 rounded-lg border border-[#CBD5E1] cursor-pointer hover:border-[#1D4ED8]">
                  <input
                    type="radio"
                    name="deliveryMethod"
                    checked={deliveryMethod === 'Retrait en boutique'}
                    onChange={() => {
                      setDeliveryMethod('Retrait en boutique');
                      setCity('Casablanca');
                    }}
                    className="mt-1 text-[#1D4ED8]"
                  />
                  <div className="flex-1 text-sm">
                    <div className="font-semibold text-[#0B192C] flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#1D4ED8]" />
                      <span>Retrait en boutique CasaTech (Gratuit)</span>
                    </div>
                    <p className="text-xs text-[#64748B] mt-0.5">{settings.store_address}</p>
                  </div>
                </label>
              )}
            </div>

            {deliveryMethod !== 'Retrait en boutique' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Ville *</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] bg-white text-sm"
                  >
                    {zones.length > 0 ? (
                      zones.map((z) => (
                        <option key={z.city} value={z.city}>
                          {z.city} ({z.delay})
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="Casablanca">Casablanca</option>
                        <option value="Rabat / Salé">Rabat / Salé</option>
                        <option value="Marrakech">Marrakech</option>
                        <option value="Tanger / Tétouan">Tanger / Tétouan</option>
                        <option value="Agadir">Agadir</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Quartier</label>
                  <input
                    type="text"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex. Maârif, Anfa, Agdal..."
                    className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#334155] mb-1">
                    Adresse de livraison *
                  </label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Rue, immeuble, appartement..."
                    className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Instructions facultatives
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Créneau horaire souhaité, code d'entrée..."
                className="w-full p-3 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B192C]">3. Paiement</h2>
            <div className="space-y-3">
              <div className="p-3.5 rounded-lg border-2 border-[#1D4ED8] bg-[#EFF6FF]/40 flex items-start gap-3">
                <input type="radio" checked readOnly className="mt-1 text-[#1D4ED8]" />
                <div className="text-sm">
                  <div className="font-semibold text-[#0B192C]">
                    Paiement à la livraison (Cash on Delivery)
                  </div>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Réglez directement au livreur en Dirhams marocains après vérification du colis.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] flex items-start gap-3 opacity-75">
                <CreditCard className="w-4 h-4 text-[#64748B] mt-0.5 shrink-0" />
                <div className="text-xs text-[#64748B]">
                  <span className="font-semibold text-[#334155]">
                    Paiement en ligne par carte bancaire (CMI / Payzone) :
                  </span>{' '}
                  Disponible uniquement après intégration et activation des clés marchandes prestataire
                  marocain côté serveur.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Summary */}
        <aside className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5 lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-bold text-[#0B192C]">Récapitulatif</h2>

          <div className="divide-y divide-[#F1F5F9] max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={`${item.product_id}-${item.variant_label}`} className="py-3 flex gap-3 items-center">
                <div className="w-14 h-14 rounded-lg bg-[#F1F5F9] overflow-hidden shrink-0">
                  <ProductImage src={item.image} alt={item.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-[#0F172A] truncate">{item.name}</div>
                  <div className="text-xs text-[#64748B]">
                    Qté {item.quantity} {item.variant_label ? `· ${item.variant_label}` : ''}
                  </div>
                </div>
                <div className="font-mono tabular-nums text-sm font-semibold text-[#0B192C]">
                  {formatMad(item.unit_price_mad * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          {/* Promo Code */}
          <div className="pt-3 border-t border-[#E2E8F0]">
            <label className="block text-xs font-semibold text-[#334155] mb-1.5">Code promo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                placeholder="Ex. CASATECH10"
                className="flex-1 h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm font-mono uppercase"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="h-10 px-4 rounded-lg bg-[#0B192C] text-white text-xs font-semibold hover:bg-[#1E293B]"
              >
                Appliquer
              </button>
            </div>
            {quote?.appliedPromoCode && (
              <div className="mt-1.5 text-xs text-[#15803D] font-medium">
                Code {quote.appliedPromoCode} appliqué (-{formatMad(quote.discountMad)}).
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#E2E8F0] space-y-2 text-sm">
            <div className="flex justify-between text-[#475569]">
              <span>Sous-total</span>
              <span className="font-mono tabular-nums">
                {formatMad(quote?.subtotalMad ?? cart.reduce((s, i) => s + i.unit_price_mad * i.quantity, 0))}
              </span>
            </div>
            {quote && quote.discountMad > 0 && (
              <div className="flex justify-between text-[#15803D]">
                <span>Remise promotionnelle</span>
                <span className="font-mono tabular-nums">-{formatMad(quote.discountMad)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#475569]">
              <span>Frais de livraison</span>
              <span className="font-mono tabular-nums">
                {quote ? (quote.shippingFeeMad === 0 ? 'Offert' : formatMad(quote.shippingFeeMad)) : 'Calcul...'}
              </span>
            </div>
            <div className="pt-2 border-t border-[#E2E8F0] flex justify-between text-base font-bold text-[#0B192C]">
              <span>Total à payer</span>
              <span className="font-mono tabular-nums text-lg">
                {formatMad(quote?.totalMad ?? cart.reduce((s, i) => s + i.unit_price_mad * i.quantity, 0))}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
          >
            <Lock className="w-4 h-4" />
            <span>{submitting ? 'Validation en cours...' : 'Confirmer la commande'}</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <ShieldCheck className="w-4 h-4 text-[#1D4ED8] shrink-0" />
            <span>Montants et disponibilité recalculés et sécurisés par notre serveur.</span>
          </div>
        </aside>
      </form>
    </div>
  );
}
