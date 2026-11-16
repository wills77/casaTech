import { MapPin, Mail, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { settings, categoryTree, navigate } = useStore();

  const handleNav = (path: string) => {
    navigate(path);
  };

  return (
    <footer className="bg-[#0B192C] text-[#CBD5E1] border-t border-[#1E293B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {/* Column 1: Brand & Address */}
        <div className="space-y-3">
          <div className="font-display text-xl font-bold text-white tracking-tight">
            {settings?.store_name || 'CasaTech'}
          </div>
          <p className="text-sm text-[#94A3B8] leading-relaxed">
            {settings?.slogan || 'Toute la technologie, au même endroit.'}
          </p>
          <div className="pt-2 space-y-2 text-xs text-[#94A3B8]">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-[#60A5FA] shrink-0 mt-0.5" />
              <span>{settings?.store_address || 'Boulevard d’Anfa, Casablanca, Maroc'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#60A5FA] shrink-0" />
              <span className="font-mono">{settings?.contact_phone || '+212 522 48 90 12'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#60A5FA] shrink-0" />
              <span>{settings?.contact_email || 'contact@casatech.ma'}</span>
            </div>
          </div>
        </div>

        {/* Column 2: Categories */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Catégories</h3>
          <ul className="space-y-2 text-sm">
            {categoryTree.map((cat) => (
              <li key={cat.id}>
                <a
                  href={`/boutique?category=${cat.slug}`}
                  onClick={(e) => {
                    e.preventDefault();
                    handleNav(`/boutique?category=${cat.slug}`);
                  }}
                  className="text-[#94A3B8] hover:text-white transition-colors"
                >
                  {cat.name}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Services & Compte */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Liens utiles</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="/boutique"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/boutique');
                }}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                Catalogue complet
              </a>
            </li>
            <li>
              <a
                href="/boutique?promo=true"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/boutique?promo=true');
                }}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                Promotions du moment
              </a>
            </li>
            <li>
              <a
                href="/compte"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/compte');
                }}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                Espace client & suivi
              </a>
            </li>
            <li>
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/contact');
                }}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                Service client Casablanca
              </a>
            </li>
            <li>
              <a
                href="/admin"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/admin');
                }}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                Administration
              </a>
            </li>
          </ul>
        </div>

        {/* Column 4: Legal & Payment */}
        <div>
          <h3 className="text-sm font-semibold text-white mb-3">Informations légales</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <a
                href="/conditions-generales"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/conditions-generales');
                }}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                Conditions générales de vente
              </a>
            </li>
            <li>
              <a
                href="/confidentialite"
                onClick={(e) => {
                  e.preventDefault();
                  handleNav('/confidentialite');
                }}
                className="text-[#94A3B8] hover:text-white transition-colors"
              >
                Politique de confidentialité
              </a>
            </li>
          </ul>
          <p className="mt-4 text-xs text-[#64748B] leading-relaxed">
            Catalogue de démonstration : les tarifs en MAD et stocks affichés servent uniquement de
            démonstration technique.
          </p>
        </div>
      </div>

      <div className="border-t border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B]">
          <span>© {new Date().getFullYear()} CasaTech Maroc. Tous droits réservés.</span>
          <span>Devise : Dirham marocain (MAD) · Casablanca</span>
        </div>
      </div>
    </footer>
  );
}
