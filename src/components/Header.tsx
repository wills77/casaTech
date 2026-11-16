import { useEffect, useState } from 'react';
import { Menu, Search, ShoppingBag, User as UserIcon, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';
import { formatMad } from '../utils/format';
import { ProductImage } from './ProductImage';

export function Header() {
  const {
    user,
    cartCount,
    setIsCartOpen,
    isSearchOpen,
    setIsSearchOpen,
    navigate,
    currentPath,
    settings,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!isSearchOpen) return;
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = (await res.json()) as Product[];
          setSearchResults(data.slice(0, 6));
        }
      } finally {
        setSearching(false);
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [isSearchOpen, searchQuery]);

  const handleLink = (path: string) => {
    setMobileMenuOpen(false);
    setIsSearchOpen(false);
    navigate(path);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setIsSearchOpen(false);
    navigate(q ? `/boutique?q=${encodeURIComponent(q)}` : '/boutique');
  };

  const navItems = [
    { label: 'Accueil', path: '/' },
    { label: 'Boutique', path: '/boutique' },
    { label: 'Catégories', path: '/boutique#categories' },
    { label: 'Promotions', path: '/boutique?promo=true' },
    { label: 'Contact', path: '/contact' },
  ];

  const basePath = currentPath.split('?')[0];

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Zone 1: Brand wordmark (single line, clean) */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleLink('/');
            }}
            className="font-display text-xl font-bold tracking-tight text-[#0B192C] whitespace-nowrap shrink-0"
          >
            {settings?.logo_text || 'CasaTech'}
          </a>

          {/* Zone 2: 5 concise single-line nav links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#475569]">
            {navItems.map((item) => {
              const isActive =
                item.path === '/' ? basePath === '/' : currentPath.startsWith(item.path.split('#')[0]);
              return (
                <a
                  key={item.label}
                  href={item.path}
                  onClick={(e) => {
                    e.preventDefault();
                    handleLink(item.path);
                  }}
                  className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors ${
                    isActive
                      ? 'text-[#0B192C] border-[#1D4ED8]'
                      : 'border-transparent hover:text-[#0B192C] hover:border-[#CBD5E1]'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Compact action cluster */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Rechercher un produit"
              className="min-h-[40px] min-w-[40px] px-2.5 flex items-center justify-center gap-1.5 rounded-lg text-sm font-medium text-[#334155] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap shrink-0"
            >
              <Search className="w-4 h-4" />
              <span className="hidden lg:inline">Rechercher</span>
            </button>

            <a
              href={user?.role === 'admin' ? '/admin' : '/compte'}
              onClick={(e) => {
                e.preventDefault();
                handleLink(user?.role === 'admin' ? '/admin' : '/compte');
              }}
              className="min-h-[40px] px-3 flex items-center gap-1.5 rounded-lg text-sm font-medium text-[#0B192C] hover:bg-[#F1F5F9] transition-colors whitespace-nowrap shrink-0"
            >
              <UserIcon className="w-4 h-4" />
              <span className="hidden sm:inline max-w-[110px] truncate">
                {user ? (user.role === 'admin' ? 'Admin' : user.full_name.split(' ')[0]) : 'Compte'}
              </span>
            </a>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Ouvrir le panier"
              className="min-h-[40px] px-3.5 py-2 flex items-center gap-2 rounded-lg text-sm font-medium text-white bg-[#1D4ED8] hover:bg-[#1E40AF] transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Panier</span>
              <span className="font-mono tabular-nums text-xs bg-white/20 px-1.5 py-0.5 rounded">
                {cartCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu mobile"
              className="md:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-[#0B192C] hover:bg-[#F1F5F9]"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Dynamic Search Bar Panel */}
        {isSearchOpen && (
          <div className="border-t border-[#E2E8F0] bg-white px-4 sm:px-6 py-4 shadow-lg">
            <div className="max-w-3xl mx-auto">
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="search"
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un smartphone, MacBook, SSD, référence SKU..."
                    className="w-full h-11 pl-10 pr-4 rounded-lg border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="h-11 px-5 rounded-lg bg-[#0B192C] text-white text-sm font-medium hover:bg-[#1E293B] whitespace-nowrap shrink-0"
                >
                  Rechercher
                </button>
                <button
                  type="button"
                  onClick={() => setIsSearchOpen(false)}
                  aria-label="Fermer la recherche"
                  className="h-11 w-11 flex items-center justify-center rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
                >
                  <X className="w-4 h-4" />
                </button>
              </form>

              {searchQuery.trim().length > 0 && (
                <div className="mt-3 divide-y divide-[#F1F5F9] border border-[#E2E8F0] rounded-lg bg-white overflow-hidden">
                  {searching ? (
                    <div className="p-4 text-sm text-[#64748B]">Recherche en cours...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-sm text-[#64748B]">
                      Aucun produit trouvé pour « {searchQuery} ».
                    </div>
                  ) : (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleLink(`/produit/${p.slug}`)}
                        className="w-full flex items-center gap-3 p-3 text-left hover:bg-[#F8FAFC] transition-colors"
                      >
                        <div className="w-12 h-12 rounded bg-[#F1F5F9] overflow-hidden shrink-0">
                          <ProductImage src={p.images[0]} alt={p.name} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-[#0F172A] truncate">{p.name}</div>
                          <div className="text-xs text-[#64748B]">
                            {p.brand_name} · {p.category_name}
                          </div>
                        </div>
                        <div className="text-sm font-semibold text-[#0B192C] font-mono tabular-nums whitespace-nowrap">
                          {formatMad(p.effective_price_mad)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#E2E8F0] bg-white px-4 py-4 space-y-1">
            {navItems.map((item) => (
              <a
                key={item.label}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleLink(item.path);
                }}
                className="block py-3 px-3 rounded-lg text-base font-medium text-[#0F172A] hover:bg-[#F1F5F9]"
              >
                {item.label}
              </a>
            ))}
            <div className="pt-2 border-t border-[#E2E8F0] flex flex-col gap-1">
              <a
                href="/compte"
                onClick={(e) => {
                  e.preventDefault();
                  handleLink('/compte');
                }}
                className="block py-3 px-3 rounded-lg text-base font-medium text-[#1D4ED8] hover:bg-[#EFF6FF]"
              >
                {user ? `Mon compte (${user.full_name})` : 'Se connecter / Créer un compte'}
              </a>
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  handleLink('/admin');
                }}
                className="block py-2.5 px-3 rounded-lg text-sm font-medium text-[#475569] hover:bg-[#F1F5F9]"
              >
                Espace Administrateur
              </a>
            </div>
          </div>
        )}
      </header>
    </>
  );
}
