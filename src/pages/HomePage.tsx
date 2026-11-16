import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ShieldCheck, Truck, Wallet } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { useStore } from '../context/StoreContext';
import type { Product } from '../types';

type ShowcaseTab = 'popular' | 'new' | 'bestseller' | 'promo';

export function HomePage() {
  const { categoryTree, brands, settings, navigate, notify } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('popular');
  const [newsEmail, setNewsEmail] = useState('');
  const [newsConsent, setNewsConsent] = useState(false);
  const [newsSubmitting, setNewsSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'CasaTech — Toute la technologie, au même endroit | Maroc';
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/products?sort=popular');
        if (res.ok) {
          setProducts((await res.json()) as Product[]);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const displayedProducts = (() => {
    if (activeTab === 'new') return products.filter((p) => p.is_new).slice(0, 8);
    if (activeTab === 'bestseller') return products.filter((p) => p.is_bestseller).slice(0, 8);
    if (activeTab === 'promo') return products.filter((p) => p.discount_percent > 0).slice(0, 8);
    return products.slice(0, 8);
  })();

  const handleNewsletter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsConsent) {
      notify('Veuillez cocher la case de consentement.', 'error');
      return;
    }
    setNewsSubmitting(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsEmail, consent: true }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        notify(data.message || 'Inscription confirmée.');
        setNewsEmail('');
        setNewsConsent(false);
      } else {
        notify(data.error || 'Erreur lors de l’inscription.', 'error');
      }
    } finally {
      setNewsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC]">
      {/* 1. Hero Showcase (Single dominant focal point) */}
      <section className="bg-[#0B192C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center space-y-6">
            <div className="text-xs font-medium tracking-wide uppercase text-[#93C5FD]">
              Casablanca · Livraison partout au Maroc · Prix en MAD
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.12] tracking-tight text-balance">
              {settings?.hero_title || 'La haute technologie à portée de main au Maroc'}
            </h1>
            <p className="text-base text-[#CBD5E1] leading-relaxed max-w-xl">
              {settings?.hero_subtitle ||
                'Smartphones dernière génération, ordinateurs professionnels et accessoires certifiés. Prix indicatifs de démonstration en MAD.'}
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/boutique')}
                className="min-h-[48px] px-7 py-3 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-sm inline-flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <span>{settings?.hero_cta || 'Découvrir nos produits'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/boutique?promo=true')}
                className="min-h-[48px] px-6 py-3 rounded-lg border border-white/25 hover:bg-white/10 text-white font-medium text-sm transition-colors whitespace-nowrap"
              >
                Voir les promotions
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="w-full h-full min-h-[260px] lg:min-h-[380px] rounded-xl overflow-hidden bg-[#1E293B] border border-white/10">
              <ProductImage
                src={settings?.hero_image || '/src/assets/images/hero_casatech_flagship_1794857259332.jpg'}
                alt="Sélection high-tech CasaTech à Casablanca"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Catégories Principales */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="flex items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B192C]">
              Catégories principales
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Explorez nos gammes smartphones, ordinateurs, tablettes et équipements.
            </p>
          </div>
          <a
            href="/boutique"
            onClick={(e) => {
              e.preventDefault();
              navigate('/boutique');
            }}
            className="text-sm font-semibold text-[#1D4ED8] hover:underline whitespace-nowrap shrink-0"
          >
            Tout le catalogue
          </a>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {categoryTree.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => navigate(`/boutique?category=${cat.slug}`)}
              className="group text-left bg-white border border-[#E2E8F0] rounded-xl overflow-hidden hover:border-[#2563EB] transition-colors"
            >
              <div className="aspect-[4/3] bg-[#F1F5F9] overflow-hidden">
                <ProductImage
                  src={cat.image_url}
                  alt={cat.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-3.5">
                <div className="font-display text-sm font-semibold text-[#0B192C] group-hover:text-[#1D4ED8]">
                  {cat.name}
                </div>
                <div className="text-xs text-[#64748B] mt-0.5 truncate">
                  {cat.subcategories?.length || 0} sous-catégories
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Sélection CasaTech (Produits Populaires / Nouveautés / Meilleures Ventes / Promotions) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B192C]">
              Sélection CasaTech
            </h2>
            <p className="text-sm text-[#475569] mt-1">
              Produits vérifiés avec garantie constructeur et stock suivi en temps réel.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtrer la sélection"
            className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#E2E8F0]/70 rounded-lg self-start"
          >
            {[
              { id: 'popular', label: 'Populaires' },
              { id: 'new', label: 'Nouveautés' },
              { id: 'bestseller', label: 'Meilleures ventes' },
              { id: 'promo', label: 'Promotions' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id as ShowcaseTab)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-[#0B192C] shadow-sm'
                    : 'text-[#475569] hover:text-[#0B192C]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl h-80 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {displayedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => navigate('/boutique')}
            className="min-h-[44px] px-7 py-2.5 rounded-lg bg-[#0B192C] hover:bg-[#1E293B] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
          >
            <span>Voir tous les produits</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* 4. Avantages CasaTech, Marques Partenaires & Newsletter */}
      <section className="bg-white border-t border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 space-y-14">
          {/* Avantages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#0B192C]">
                  Livraison Express Maroc
                </h3>
                <p className="text-sm text-[#475569] mt-1 leading-relaxed">
                  Expédition sous 24h à Casablanca et 24–72h vers Rabat, Marrakech, Tanger et Agadir.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#0B192C]">
                  Paiement à la livraison
                </h3>
                <p className="text-sm text-[#475569] mt-1 leading-relaxed">
                  Réglez en espèces au livreur lors de la réception ou retirez directement en boutique à
                  Casablanca.
                </p>
              </div>
            </div>

            <div className="flex gap-4 items-start">
              <div className="w-11 h-11 rounded-lg bg-[#EFF6FF] text-[#1D4ED8] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display text-base font-bold text-[#0B192C]">
                  Produits Authentiques & Support
                </h3>
                <p className="text-sm text-[#475569] mt-1 leading-relaxed">
                  Assistance technique dédiée à Casablanca et service après-vente transparent.
                </p>
              </div>
            </div>
          </div>

          {/* Marques partenaires */}
          <div className="pt-8 border-t border-[#E2E8F0]">
            <div className="text-xs uppercase tracking-wider font-semibold text-[#64748B] mb-5">
              Marques disponibles sur CasaTech
            </div>
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
              {brands.slice(0, 12).map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => navigate(`/boutique?brand=${b.slug}`)}
                  className="font-display text-base font-semibold text-[#475569] hover:text-[#1D4ED8] transition-colors"
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          {/* Newsletter avec consentement */}
          <div className="pt-8 border-t border-[#E2E8F0] grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-6">
              <h3 className="font-display text-xl font-bold text-[#0B192C]">
                Restez informé des nouveautés et offres CasaTech
              </h3>
              <p className="text-sm text-[#475569] mt-1">
                Recevez nos arrivages high-tech et remises exclusives à Casablanca. Désinscription en un clic.
              </p>
            </div>
            <form onSubmit={handleNewsletter} className="lg:col-span-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  value={newsEmail}
                  onChange={(e) => setNewsEmail(e.target.value)}
                  placeholder="Votre adresse e-mail"
                  className="flex-1 h-11 px-4 rounded-lg border border-[#CBD5E1] text-sm text-[#0F172A] focus:border-[#2563EB] focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={newsSubmitting}
                  className="h-11 px-6 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  {newsSubmitting ? 'Envoi...' : "S'inscrire"}
                </button>
              </div>
              <label className="flex items-start gap-2.5 text-xs text-[#475569] cursor-pointer">
                <input
                  type="checkbox"
                  checked={newsConsent}
                  onChange={(e) => setNewsConsent(e.target.checked)}
                  className="mt-0.5 rounded border-[#CBD5E1] text-[#1D4ED8]"
                />
                <span>
                  J&apos;accepte de recevoir les communications commerciales de CasaTech conformément à la{' '}
                  <a
                    href="/confidentialite"
                    onClick={(e) => {
                      e.preventDefault();
                      navigate('/confidentialite');
                    }}
                    className="underline text-[#0B192C]"
                  >
                    politique de confidentialité
                  </a>
                  .
                </span>
              </label>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
