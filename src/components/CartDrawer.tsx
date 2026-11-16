import { ArrowRight, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMad } from '../utils/format';
import { ProductImage } from './ProductImage';

export function CartDrawer() {
  const {
    cart,
    cartSubtotal,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
    settings,
    navigate,
  } = useStore();

  if (!isCartOpen) return null;

  const threshold = settings?.free_shipping_threshold ?? 2500;
  const remainingForFree = Math.max(0, threshold - cartSubtotal);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-[#0B192C]/50 backdrop-blur-[2px]"
        onClick={() => setIsCartOpen(false)}
      />
      <aside
        aria-label="Panier d'achat"
        className="relative z-10 w-full max-w-md bg-white h-full flex flex-col shadow-2xl border-l border-[#E2E8F0]"
      >
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-[#1D4ED8]" />
            <h2 className="font-display text-lg font-bold text-[#0B192C]">Votre Panier</h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Fermer le panier"
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-[#475569] hover:bg-[#F1F5F9]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free shipping indicator */}
        {cart.length > 0 && (
          <div className="px-6 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs text-[#334155]">
            {remainingForFree === 0 ? (
              <span className="font-medium text-[#15803D]">
                Livraison offerte partout au Maroc pour cette commande.
              </span>
            ) : (
              <span>
                Ajoutez <strong className="font-mono tabular-nums">{formatMad(remainingForFree)}</strong> pour
                bénéficier de la livraison offerte.
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#64748B]">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-[#0F172A]">Votre panier est vide</p>
                <p className="text-sm text-[#64748B] mt-1">
                  Parcourez notre catalogue high-tech pour ajouter des articles.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/boutique');
                }}
                className="px-5 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-medium hover:bg-[#1E40AF]"
              >
                Découvrir la boutique
              </button>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={`${item.product_id}-${item.variant_label}`}
                className="flex gap-4 pb-4 border-b border-[#F1F5F9]"
              >
                <div className="w-20 h-20 rounded-lg bg-[#F1F5F9] overflow-hidden shrink-0">
                  <ProductImage src={item.image} alt={item.name} />
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={`/produit/${item.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      setIsCartOpen(false);
                      navigate(`/produit/${item.slug}`);
                    }}
                    className="text-sm font-semibold text-[#0F172A] hover:text-[#1D4ED8] line-clamp-1"
                  >
                    {item.name}
                  </a>
                  {item.variant_label && (
                    <div className="text-xs text-[#64748B] mt-0.5">{item.variant_label}</div>
                  )}
                  <div className="text-sm font-semibold text-[#0B192C] font-mono tabular-nums mt-1">
                    {formatMad(item.unit_price_mad)}
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-[#E2E8F0] rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product_id, item.variant_label, item.quantity - 1)}
                        aria-label="Diminuer la quantité"
                        className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC]"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-mono tabular-nums font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product_id, item.variant_label, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        aria-label="Augmenter la quantité"
                        className="w-8 h-8 flex items-center justify-center text-[#475569] hover:bg-[#F8FAFC] disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product_id, item.variant_label)}
                      aria-label="Supprimer du panier"
                      className="text-[#94A3B8] hover:text-[#DC2626] p-1.5"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-6 border-t border-[#E2E8F0] bg-[#F8FAFC] space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#475569]">Sous-total estimé</span>
              <span className="text-lg font-bold text-[#0B192C] font-mono tabular-nums">
                {formatMad(cartSubtotal)}
              </span>
            </div>
            <p className="text-xs text-[#64748B]">
              Frais de livraison et codes promotionnels vérifiés à l&apos;étape de commande.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                navigate('/commander');
              }}
              className="w-full py-3 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <span>Passer la commande</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
