import { Heart, ShoppingCart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { formatMad } from '../utils/format';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, navigate, favoriteIds, toggleFavorite } = useStore();
  const isFav = favoriteIds.includes(product.id);
  const inStock = product.stock > 0;

  const defaultVariant = product.variants
    .map((v) => v.options[0])
    .filter(Boolean)
    .join(' / ');

  return (
    <article className="group bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Product Imagery */}
      <div className="relative aspect-[4/3] bg-[#F1F5F9] overflow-hidden">
        <a
          href={`/produit/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/produit/${product.slug}`);
          }}
          className="block w-full h-full"
        >
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </a>
        <button
          type="button"
          onClick={() => toggleFavorite(product.id)}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute top-3 right-3 w-9 h-9 rounded-lg bg-white/90 backdrop-blur-sm border border-[#E2E8F0] flex items-center justify-center text-[#475569] hover:text-[#DC2626] transition-colors"
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-[#DC2626] text-[#DC2626]' : ''}`} />
        </button>
      </div>

      {/* Product Metadata & Actions (Zero-Pill Discipline) */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-xs text-[#64748B]">
          <span className="uppercase tracking-wide font-medium truncate">
            {product.brand_name} · {product.category_name}
          </span>
          {product.discount_percent > 0 && (
            <span className="font-mono font-semibold text-[#DC2626] shrink-0">
              -{product.discount_percent}%
            </span>
          )}
        </div>

        <a
          href={`/produit/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/produit/${product.slug}`);
          }}
          className="mt-1.5 font-display text-base font-semibold text-[#0F172A] hover:text-[#1D4ED8] line-clamp-1"
        >
          {product.name}
        </a>

        <p className="mt-1 text-xs text-[#64748B] line-clamp-2 min-h-[2rem]">{product.short_desc}</p>

        <div className="mt-3 pt-3 border-t border-[#F1F5F9] flex items-baseline justify-between gap-2">
          <div>
            <div className="text-base font-bold text-[#0B192C] font-mono tabular-nums">
              {formatMad(product.effective_price_mad)}
            </div>
            {product.promo_price_mad !== null && product.promo_price_mad < product.price_mad && (
              <div className="text-xs text-[#94A3B8] line-through font-mono tabular-nums">
                {formatMad(product.price_mad)}
              </div>
            )}
          </div>
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              inStock ? 'text-[#15803D]' : 'text-[#DC2626]'
            }`}
          >
            {inStock ? `En stock (${product.stock})` : 'Rupture'}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => navigate(`/produit/${product.slug}`)}
            className="min-h-[40px] px-3 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#0B192C] hover:bg-[#F8FAFC] transition-colors whitespace-nowrap"
          >
            Voir le produit
          </button>
          <button
            type="button"
            disabled={!inStock}
            onClick={() => addToCart(product, 1, defaultVariant)}
            className="min-h-[40px] px-3 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:bg-[#CBD5E1] disabled:text-[#64748B] disabled:cursor-not-allowed whitespace-nowrap"
          >
            <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>
    </article>
  );
}
