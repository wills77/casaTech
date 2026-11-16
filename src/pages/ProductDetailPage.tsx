import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Minus, Plus, ShieldCheck, ShoppingCart, Star, Truck } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { useStore } from '../context/StoreContext';
import type { Product, Review } from '../types';
import { formatDateFr, formatMad } from '../utils/format';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { addToCart, navigate, favoriteIds, toggleFavorite, user, notify } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similar, setSimilar] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewAuthor, setReviewAuthor] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    const loadProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          setError('Produit introuvable.');
          return;
        }
        const data = (await res.json()) as {
          product: Product;
          reviews: Review[];
          similar: Product[];
        };
        setProduct(data.product);
        setReviews(data.reviews);
        setSimilar(data.similar);
        setSelectedImageIdx(0);
        setQuantity(1);

        const defaults: Record<string, string> = {};
        data.product.variants.forEach((v) => {
          if (v.options.length > 0) defaults[v.name] = v.options[0];
        });
        setSelectedVariants(defaults);

        document.title = `${data.product.name} — ${formatMad(data.product.effective_price_mad)} | CasaTech`;
        const metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) {
          metaDesc.setAttribute('content', data.product.short_desc || data.product.description.slice(0, 155));
        }
      } catch {
        setError('Impossible de charger ce produit.');
      } finally {
        setLoading(false);
      }
    };
    loadProduct();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-6 aspect-[4/3] bg-white border border-[#E2E8F0] rounded-xl animate-pulse" />
          <div className="lg:col-span-6 h-96 bg-white border border-[#E2E8F0] rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold text-[#0B192C]">{error || 'Produit introuvable'}</h1>
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="px-6 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold"
        >
          Retour à la boutique
        </button>
      </div>
    );
  }

  const isFav = favoriteIds.includes(product.id);
  const inStock = product.stock > 0;
  const variantLabel = Object.values(selectedVariants).filter(Boolean).join(' / ');

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: user ? user.full_name : reviewAuthor,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      if (res.ok) {
        const created = (await res.json()) as Review;
        setReviews((prev) => [created, ...prev]);
        setReviewComment('');
        setReviewAuthor('');
        notify('Merci pour votre avis !');
      } else {
        const errData = (await res.json()) as { error?: string };
        notify(errData.error || 'Impossible de publier votre avis.', 'error');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-[#64748B] mb-6">
        <button
          type="button"
          onClick={() => navigate('/boutique')}
          className="inline-flex items-center gap-1 hover:text-[#0B192C]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Boutique</span>
        </button>
        <span aria-hidden="true">/</span>
        <button
          type="button"
          onClick={() => navigate(`/boutique?category=${product.category_slug}`)}
          className="hover:text-[#0B192C]"
        >
          {product.category_name}
        </button>
        <span aria-hidden="true">/</span>
        <span className="text-[#0B192C] font-medium truncate">{product.name}</span>
      </div>

      {/* Main Contiguous PDP Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Sticky Gallery */}
        <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-3">
          <div className="aspect-[4/3] bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <ProductImage
              src={product.images[selectedImageIdx] || product.images[0]}
              alt={product.name}
            />
          </div>
          {product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`w-20 h-16 rounded-lg overflow-hidden border-2 bg-white shrink-0 ${
                    selectedImageIdx === idx ? 'border-[#1D4ED8]' : 'border-[#E2E8F0]'
                  }`}
                >
                  <ProductImage src={img} alt={`${product.name} vue ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-3 text-xs text-[#64748B]">
              <span className="uppercase tracking-wider font-semibold">
                {product.brand_name} · Réf. <span className="font-mono">{product.sku}</span>
              </span>
              <button
                type="button"
                onClick={() => toggleFavorite(product.id)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475569] hover:text-[#DC2626]"
              >
                <Heart className={`w-4 h-4 ${isFav ? 'fill-[#DC2626] text-[#DC2626]' : ''}`} />
                <span>{isFav ? 'Enregistré' : 'Favori'}</span>
              </button>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#0B192C] text-balance">
              {product.name}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-xs text-[#475569]">
              <div className="flex items-center text-[#D97706]">
                <Star className="w-4 h-4 fill-current" />
                <span className="ml-1 font-mono font-semibold text-[#0B192C]">
                  {product.avg_rating > 0 ? product.avg_rating : '5.0'}
                </span>
              </div>
              <span aria-hidden="true">·</span>
              <span>{reviews.length} avis clients</span>
              <span aria-hidden="true">·</span>
              <span className={inStock ? 'text-[#15803D] font-semibold' : 'text-[#DC2626] font-semibold'}>
                {inStock ? `En stock (${product.stock} disponibles)` : 'Rupture de stock'}
              </span>
            </div>
          </div>

          {/* Pricing Block */}
          <div className="py-4 border-y border-[#F1F5F9] flex items-baseline gap-4 flex-wrap">
            <span className="text-3xl font-bold text-[#0B192C] font-mono tabular-nums">
              {formatMad(product.effective_price_mad)}
            </span>
            {product.promo_price_mad !== null && product.promo_price_mad < product.price_mad && (
              <>
                <span className="text-lg text-[#94A3B8] line-through font-mono tabular-nums">
                  {formatMad(product.price_mad)}
                </span>
                <span className="text-sm font-bold text-[#DC2626] font-mono">
                  Économisez {product.discount_percent}%
                </span>
              </>
            )}
            {product.is_demo && (
              <span className="text-xs text-[#64748B] w-full">
                Prix indicatif de démonstration (catalogue test CasaTech).
              </span>
            )}
          </div>

          <p className="text-sm text-[#334155] leading-relaxed">{product.description}</p>

          {/* Variants Selector */}
          {product.variants.length > 0 && (
            <div className="space-y-4">
              {product.variants.map((variant) => (
                <div key={variant.name}>
                  <div className="text-xs font-semibold text-[#0B192C] uppercase tracking-wide mb-2">
                    {variant.name} :{' '}
                    <span className="font-normal text-[#475569]">{selectedVariants[variant.name]}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variant.options.map((opt) => {
                      const active = selectedVariants[variant.name] === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() =>
                            setSelectedVariants((prev) => ({ ...prev, [variant.name]: opt }))
                          }
                          className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors ${
                            active
                              ? 'border-[#1D4ED8] bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                              : 'border-[#CBD5E1] text-[#334155] hover:border-[#0B192C]'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quantity & Primary Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center border border-[#CBD5E1] rounded-lg h-12">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Diminuer quantité"
                  className="w-11 h-full flex items-center justify-center text-[#334155] hover:bg-[#F8FAFC]"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-mono tabular-nums font-semibold text-sm">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(Math.max(1, product.stock), q + 1))}
                  disabled={!inStock || quantity >= product.stock}
                  aria-label="Augmenter quantité"
                  className="w-11 h-full flex items-center justify-center text-[#334155] hover:bg-[#F8FAFC] disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                disabled={!inStock}
                onClick={() => addToCart(product, quantity, variantLabel)}
                className="flex-1 min-w-[180px] h-12 px-6 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:bg-[#CBD5E1] disabled:text-[#64748B]"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Ajouter au panier</span>
              </button>
            </div>

            <button
              type="button"
              disabled={!inStock}
              onClick={() => {
                addToCart(product, quantity, variantLabel);
                navigate('/commander');
              }}
              className="w-full h-12 px-6 rounded-lg bg-[#0B192C] hover:bg-[#1E293B] text-white text-sm font-semibold transition-colors disabled:bg-[#E2E8F0] disabled:text-[#94A3B8]"
            >
              Acheter maintenant
            </button>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-[#475569]">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1D4ED8] shrink-0" />
              <span>Livraison 24h Casablanca · 48h Maroc</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#1D4ED8] shrink-0" />
              <span>Paiement à la livraison (COD) disponible</span>
            </div>
          </div>
        </div>
      </div>

      {/* Technical Specs & Reviews */}
      <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6">
          <h2 className="font-display text-lg font-bold text-[#0B192C] mb-4">
            Caractéristiques techniques
          </h2>
          {product.specs.length === 0 ? (
            <p className="text-sm text-[#64748B]">Spécifications standards constructeur.</p>
          ) : (
            <dl className="divide-y divide-[#F1F5F9]">
              {product.specs.map((spec, idx) => (
                <div key={idx} className="py-3 flex items-baseline justify-between gap-4 text-sm">
                  <dt className="text-[#64748B] font-medium">{spec.label}</dt>
                  <dd className="text-[#0F172A] font-semibold text-right">{spec.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>

        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6">
          <h2 className="font-display text-lg font-bold text-[#0B192C]">
            Avis clients ({reviews.length})
          </h2>

          <form onSubmit={handleReviewSubmit} className="p-4 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-3">
            <div className="text-sm font-semibold text-[#0B192C]">Laisser un avis</div>
            <div className="flex flex-wrap items-center gap-4">
              {!user && (
                <input
                  type="text"
                  required
                  value={reviewAuthor}
                  onChange={(e) => setReviewAuthor(e.target.value)}
                  placeholder="Votre nom"
                  className="h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm flex-1 min-w-[160px]"
                />
              )}
              <select
                aria-label="Note"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm"
              >
                <option value={5}>5 / 5 — Excellent</option>
                <option value={4}>4 / 5 — Très bien</option>
                <option value={3}>3 / 5 — Correct</option>
                <option value={2}>2 / 5 — Moyen</option>
                <option value={1}>1 / 5 — Insuffisant</option>
              </select>
            </div>
            <textarea
              required
              rows={2}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder="Partagez votre expérience avec ce produit..."
              className="w-full p-3 rounded-lg border border-[#CBD5E1] bg-white text-sm"
            />
            <button
              type="submit"
              disabled={submittingReview}
              className="px-4 py-2 rounded-lg bg-[#0B192C] text-white text-xs font-semibold hover:bg-[#1E293B]"
            >
              {submittingReview ? 'Publication...' : 'Publier mon avis'}
            </button>
          </form>

          {reviews.length === 0 ? (
            <p className="text-sm text-[#64748B]">Aucun avis pour le moment. Soyez le premier à donner votre avis.</p>
          ) : (
            <div className="divide-y divide-[#F1F5F9]">
              {reviews.map((r) => (
                <div key={r.id} className="py-4 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#64748B]">
                    <span className="font-semibold text-[#0F172A] text-sm">
                      {r.author_name}
                      {r.is_verified === 1 && ' · Achat vérifié'}
                    </span>
                    <span>{formatDateFr(r.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 text-[#D97706]">
                    {Array.from({ length: r.rating }).map((_, idx) => (
                      <Star key={idx} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-sm text-[#334155] leading-relaxed">{r.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Similar Products */}
      {similar.length > 0 && (
        <div className="mt-14">
          <h2 className="font-display text-2xl font-bold text-[#0B192C] mb-6">Produits similaires</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similar.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
