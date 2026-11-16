import { useEffect, useMemo, useState } from 'react';
import { Filter, Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

export function ShopPage() {
  const { categoryTree, brands, currentPath, navigate } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const searchParams = useMemo(() => {
    const queryStr = currentPath.includes('?') ? currentPath.split('?')[1] : '';
    return new URLSearchParams(queryStr);
  }, [currentPath]);

  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [subcategory, setSubcategory] = useState(searchParams.get('subcategory') || '');
  const [brand, setBrand] = useState(searchParams.get('brand') || '');
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStock, setInStock] = useState(searchParams.get('inStock') === 'true');
  const [promo, setPromo] = useState(searchParams.get('promo') === 'true');
  const [isNew, setIsNew] = useState(searchParams.get('isNew') === 'true');
  const [sort, setSort] = useState(searchParams.get('sort') || 'popular');

  useEffect(() => {
    setCategory(searchParams.get('category') || '');
    setSubcategory(searchParams.get('subcategory') || '');
    setBrand(searchParams.get('brand') || '');
    setQ(searchParams.get('q') || '');
    setPromo(searchParams.get('promo') === 'true');
    setIsNew(searchParams.get('isNew') === 'true');
  }, [searchParams]);

  useEffect(() => {
    document.title = 'Boutique High-Tech — CasaTech Maroc';
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category) params.set('category', category);
        if (subcategory) params.set('subcategory', subcategory);
        if (brand) params.set('brand', brand);
        if (q.trim()) params.set('q', q.trim());
        if (minPrice) params.set('minPrice', minPrice);
        if (maxPrice) params.set('maxPrice', maxPrice);
        if (inStock) params.set('inStock', 'true');
        if (promo) params.set('promo', 'true');
        if (isNew) params.set('isNew', 'true');
        if (sort) params.set('sort', sort);

        const res = await fetch(`/api/products?${params.toString()}`);
        if (res.ok) {
          setProducts((await res.json()) as Product[]);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [category, subcategory, brand, q, minPrice, maxPrice, inStock, promo, isNew, sort]);

  const activeCategoryObj = categoryTree.find((c) => c.slug === category);

  const resetFilters = () => {
    setCategory('');
    setSubcategory('');
    setBrand('');
    setQ('');
    setMinPrice('');
    setMaxPrice('');
    setInStock(false);
    setPromo(false);
    setIsNew(false);
    setSort('popular');
    navigate('/boutique');
  };

  const filterPanel = (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-bold text-[#0B192C]">Catégories</h3>
          {(category || subcategory || brand || promo || isNew || inStock || minPrice || maxPrice || q) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-medium text-[#1D4ED8] hover:underline"
            >
              Réinitialiser
            </button>
          )}
        </div>
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => {
              setCategory('');
              setSubcategory('');
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              !category ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold' : 'text-[#475569] hover:bg-[#F1F5F9]'
            }`}
          >
            Toutes les catégories
          </button>
          {categoryTree.map((cat) => (
            <div key={cat.id}>
              <button
                type="button"
                onClick={() => {
                  setCategory(cat.slug);
                  setSubcategory('');
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  category === cat.slug
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                    : 'text-[#475569] hover:bg-[#F1F5F9]'
                }`}
              >
                {cat.name}
              </button>
              {category === cat.slug && cat.subcategories && cat.subcategories.length > 0 && (
                <div className="ml-3 pl-3 border-l border-[#E2E8F0] my-1 space-y-1">
                  {cat.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setSubcategory(subcategory === sub.slug ? '' : sub.slug)}
                      className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                        subcategory === sub.slug
                          ? 'text-[#1D4ED8] font-semibold bg-[#F8FAFC]'
                          : 'text-[#64748B] hover:text-[#0B192C]'
                      }`}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Marque */}
      <div className="pt-4 border-t border-[#E2E8F0]">
        <label htmlFor="brand-filter" className="block font-display text-sm font-bold text-[#0B192C] mb-2">
          Marque
        </label>
        <select
          id="brand-filter"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#0F172A]"
        >
          <option value="">Toutes les marques</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Prix Min / Max */}
      <div className="pt-4 border-t border-[#E2E8F0]">
        <h3 className="font-display text-sm font-bold text-[#0B192C] mb-2">Budget (MAD)</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm font-mono tabular-nums"
          />
          <input
            type="number"
            min="0"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm font-mono tabular-nums"
          />
        </div>
      </div>

      {/* Options */}
      <div className="pt-4 border-t border-[#E2E8F0] space-y-2.5">
        <h3 className="font-display text-sm font-bold text-[#0B192C]">Critères</h3>
        <label className="flex items-center gap-2.5 text-sm text-[#334155] cursor-pointer">
          <input
            type="checkbox"
            checked={inStock}
            onChange={(e) => setInStock(e.target.checked)}
            className="rounded border-[#CBD5E1] text-[#1D4ED8]"
          />
          <span>En stock uniquement</span>
        </label>
        <label className="flex items-center gap-2.5 text-sm text-[#334155] cursor-pointer">
          <input
            type="checkbox"
            checked={promo}
            onChange={(e) => setPromo(e.target.checked)}
            className="rounded border-[#CBD5E1] text-[#1D4ED8]"
          />
          <span>En promotion</span>
        </label>
        <label className="flex items-center gap-2.5 text-sm text-[#334155] cursor-pointer">
          <input
            type="checkbox"
            checked={isNew}
            onChange={(e) => setIsNew(e.target.checked)}
            className="rounded border-[#CBD5E1] text-[#1D4ED8]"
          />
          <span>Nouveautés</span>
        </label>
      </div>
    </div>
  );

  return (
    <div id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      {/* Page Title & Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B192C]">
            {activeCategoryObj ? activeCategoryObj.name : 'Boutique High-Tech'}
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            <span className="font-mono tabular-nums font-medium">{products.length}</span> produit(s)
            correspondant à vos critères · Prix de démonstration en MAD.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrer par mot-clé, SKU..."
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#CBD5E1] bg-white text-sm"
            />
          </div>

          <select
            aria-label="Trier les produits"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm text-[#0F172A]"
          >
            <option value="popular">Popularité</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
            <option value="newest">Nouveautés</option>
          </select>

          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className="lg:hidden h-10 px-3.5 rounded-lg border border-[#CBD5E1] bg-white text-sm font-medium text-[#0B192C] inline-flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Filtres</span>
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block lg:col-span-3">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 sticky top-24">
            {filterPanel}
          </div>
        </aside>

        {/* Product Grid */}
        <div className="lg:col-span-9">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl h-80 animate-pulse" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center space-y-4">
              <Filter className="w-8 h-8 text-[#94A3B8] mx-auto" />
              <div>
                <h3 className="font-display text-lg font-bold text-[#0B192C]">Aucun produit trouvé</h3>
                <p className="text-sm text-[#64748B] mt-1">
                  Essayez d&apos;élargir votre budget ou de réinitialiser les filtres actifs.
                </p>
              </div>
              <button
                type="button"
                onClick={resetFilters}
                className="px-5 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-[#0B192C]/50" onClick={() => setMobileFiltersOpen(false)} />
          <div className="relative z-10 w-80 max-w-full bg-white h-full p-6 overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#E2E8F0]">
              <span className="font-display text-lg font-bold text-[#0B192C]">Filtres</span>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-lg text-[#475569] hover:bg-[#F1F5F9]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  );
}
