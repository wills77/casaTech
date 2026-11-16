import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { Product, ProductSpec, ProductVariant } from '../../types';

const STUDIO_IMAGES = [
  { label: 'Smartphone Pro', url: '/src/assets/images/prod_iphone_pro_1794857259852.jpg' },
  { label: 'Smartphone Android', url: '/src/assets/images/prod_samsung_galaxy_1794857260140.jpg' },
  { label: 'MacBook Aluminium', url: '/src/assets/images/prod_macbook_air_1794857260382.jpg' },
  { label: 'PC Portable Pro', url: '/src/assets/images/prod_business_laptop_1794857260654.jpg' },
  { label: 'Tablette & Stylet', url: '/src/assets/images/prod_tablet_stylus_1794857260678.jpg' },
  { label: 'Écouteurs sans fil', url: '/src/assets/images/prod_wireless_earbuds_1794857261577.jpg' },
  { label: 'Chargeur USB-C', url: '/src/assets/images/prod_usb_charger_1794857261702.jpg' },
  { label: 'Souris sans fil', url: '/src/assets/images/prod_wireless_mouse_1794857261706.jpg' },
  { label: 'Clavier mécanique', url: '/src/assets/images/prod_mechanical_keyboard_1794857262298.jpg' },
  { label: 'Écran 4K', url: '/src/assets/images/prod_monitor_display_1794857262676.jpg' },
  { label: 'Disque SSD', url: '/src/assets/images/prod_nvme_ssd_1794857263583.jpg' },
];

interface AdminProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

export function AdminProductModal({ product, onClose, onSaved }: AdminProductModalProps) {
  const { categoryTree, brands, notify } = useStore();

  const [sku, setSku] = useState(product?.sku || '');
  const [name, setName] = useState(product?.name || '');
  const [brandId, setBrandId] = useState<string>(product?.brand_id ? String(product.brand_id) : '');
  const [categoryId, setCategoryId] = useState<string>(
    product?.category_id ? String(product.category_id) : String(categoryTree[0]?.id || '')
  );
  const [subcategoryId, setSubcategoryId] = useState<string>(
    product?.subcategory_id ? String(product.subcategory_id) : ''
  );
  const [priceMad, setPriceMad] = useState<string>(product ? String(product.price_mad) : '');
  const [promoPriceMad, setPromoPriceMad] = useState<string>(
    product?.promo_price_mad ? String(product.promo_price_mad) : ''
  );
  const [stock, setStock] = useState<string>(product ? String(product.stock) : '10');
  const [shortDesc, setShortDesc] = useState(product?.short_desc || '');
  const [description, setDescription] = useState(product?.description || '');
  const [images, setImages] = useState<string[]>(
    product?.images?.length ? product.images : [STUDIO_IMAGES[0].url]
  );
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [specs, setSpecs] = useState<ProductSpec[]>(
    product?.specs?.length ? product.specs : [{ label: 'Garantie', value: '12 mois CasaTech' }]
  );
  const [variants, setVariants] = useState<ProductVariant[]>(
    product?.variants?.length ? product.variants : [{ name: 'Couleur', options: ['Noir', 'Argent'] }]
  );

  const [isPublished, setIsPublished] = useState(product ? product.is_published : true);
  const [isNew, setIsNew] = useState(product ? product.is_new : true);
  const [isBestseller, setIsBestseller] = useState(product ? product.is_bestseller : false);
  const [isFeatured, setIsFeatured] = useState(product ? product.is_featured : false);
  const [saving, setSaving] = useState(false);

  const selectedCat = categoryTree.find((c) => String(c.id) === categoryId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        sku,
        name,
        brand_id: brandId ? Number(brandId) : null,
        category_id: Number(categoryId),
        subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        price_mad: Number(priceMad),
        promo_price_mad: promoPriceMad ? Number(promoPriceMad) : null,
        stock: Number(stock),
        short_desc: shortDesc,
        description,
        specs: specs.filter((s) => s.label.trim() && s.value.trim()),
        images: images.filter(Boolean),
        variants: variants.filter((v) => v.name.trim() && v.options.length > 0),
        is_published: isPublished,
        is_new: isNew,
        is_bestseller: isBestseller,
        is_featured: isFeatured,
      };

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const res = await fetch(url, {
        method: product ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        notify(err.error || 'Erreur enregistrement produit.', 'error');
        return;
      }
      notify(product ? 'Produit mis à jour.' : 'Produit créé avec succès.');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B192C]/60 backdrop-blur-[2px]">
      <div className="bg-white border border-[#E2E8F0] rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-[#0B192C]">
            {product ? `Modifier : ${product.name}` : 'Nouveau produit'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:bg-[#F1F5F9]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Référence SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="CT-PROD-001"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono text-xs"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-[#334155] mb-1">Nom du produit *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Catégorie *</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId('');
                }}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white"
              >
                {categoryTree.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Sous-catégorie</label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white"
              >
                <option value="">Aucune</option>
                {selectedCat?.subcategories?.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Marque</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white"
              >
                <option value="">Générique</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Prix (MAD) *</label>
              <input
                type="number"
                required
                min="1"
                value={priceMad}
                onChange={(e) => setPriceMad(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Prix promotionnel (MAD)
              </label>
              <input
                type="number"
                min="1"
                value={promoPriceMad}
                onChange={(e) => setPromoPriceMad(e.target.value)}
                placeholder="Optionnel"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Stock disponible *</label>
              <input
                type="number"
                required
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Accroche courte</label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">Description détaillée</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 rounded-lg border border-[#CBD5E1]"
            />
          </div>

          {/* Images Manager */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#334155]">Images du produit</label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-16 rounded border border-[#CBD5E1] overflow-hidden">
                  <img src={img} alt="Aperçu" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 bg-white/90 rounded p-0.5 text-[#DC2626]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) setImages((prev) => [...prev, e.target.value]);
                  e.target.value = '';
                }}
                className="h-9 px-3 rounded-lg border border-[#CBD5E1] bg-white text-xs"
              >
                <option value="">+ Ajouter une image studio...</option>
                {STUDIO_IMAGES.map((s) => (
                  <option key={s.url} value={s.url}>
                    {s.label}
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={customImageUrl}
                onChange={(e) => setCustomImageUrl(e.target.value)}
                placeholder="Ou URL image personnalisée..."
                className="flex-1 h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs"
              />
              <button
                type="button"
                onClick={() => {
                  if (customImageUrl.trim()) {
                    setImages((prev) => [...prev, customImageUrl.trim()]);
                    setCustomImageUrl('');
                  }
                }}
                className="h-9 px-3 rounded-lg bg-[#0B192C] text-white text-xs font-semibold"
              >
                Ajouter URL
              </button>
            </div>
          </div>

          {/* Specs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155]">Caractéristiques techniques</label>
              <button
                type="button"
                onClick={() => setSpecs((prev) => [...prev, { label: '', value: '' }])}
                className="text-xs text-[#1D4ED8] font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter ligne
              </button>
            </div>
            {specs.map((sp, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex. Écran"
                  value={sp.label}
                  onChange={(e) =>
                    setSpecs((prev) => prev.map((x, idx) => (idx === i ? { ...x, label: e.target.value } : x)))
                  }
                  className="flex-1 h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs"
                />
                <input
                  type="text"
                  placeholder="Ex. 6,1 OLED"
                  value={sp.value}
                  onChange={(e) =>
                    setSpecs((prev) => prev.map((x, idx) => (idx === i ? { ...x, value: e.target.value } : x)))
                  }
                  className="flex-1 h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs"
                />
                <button
                  type="button"
                  onClick={() => setSpecs((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-2 text-[#94A3B8] hover:text-[#DC2626]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Variants */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#334155]">Variantes (Couleur, Stockage, RAM)</label>
              <button
                type="button"
                onClick={() => setVariants((prev) => [...prev, { name: '', options: [] }])}
                className="text-xs text-[#1D4ED8] font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter variante
              </button>
            </div>
            {variants.map((v, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ex. Stockage"
                  value={v.name}
                  onChange={(e) =>
                    setVariants((prev) => prev.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))
                  }
                  className="w-40 h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs"
                />
                <input
                  type="text"
                  placeholder="Options séparées par virgule (ex: 128 Go, 256 Go)"
                  value={v.options.join(', ')}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, idx) =>
                        idx === i
                          ? {
                              ...x,
                              options: e.target.value
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean),
                            }
                          : x
                      )
                    )
                  }
                  className="flex-1 h-9 px-3 rounded-lg border border-[#CBD5E1] text-xs"
                />
                <button
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-2 text-[#94A3B8] hover:text-[#DC2626]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-6 pt-2 border-t border-[#E2E8F0]">
            <label className="flex items-center gap-2 text-xs font-medium text-[#334155]">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
              />
              <span>Publié sur la boutique</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-[#334155]">
              <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} />
              <span>Marquer comme Nouveauté</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-[#334155]">
              <input
                type="checkbox"
                checked={isBestseller}
                onChange={(e) => setIsBestseller(e.target.checked)}
              />
              <span>Meilleure vente</span>
            </label>
            <label className="flex items-center gap-2 text-xs font-medium text-[#334155]">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              <span>Mis en avant</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#334155]"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
