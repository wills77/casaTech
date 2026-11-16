import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Brand, CartItem, Category, Product, SiteSettings, User } from '../types';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  user: User | null;
  authLoading: boolean;
  refreshAuth: () => Promise<void>;
  logout: () => Promise<void>;
  categories: Category[];
  categoryTree: Category[];
  brands: Brand[];
  settings: SiteSettings | null;
  refreshStoreData: () => Promise<void>;
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, variantLabel?: string) => void;
  updateCartQty: (productId: number, variantLabel: string, quantity: number) => void;
  removeFromCart: (productId: number, variantLabel: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  favoriteIds: number[];
  toggleFavorite: (productId: number) => Promise<void>;
  notify: (text: string, type?: 'success' | 'error' | 'info') => void;
  navigate: (path: string) => void;
  currentPath: string;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'casatech_cart_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState<string>(
    () => window.location.pathname + window.location.search
  );
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname + window.location.search);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((path: string) => {
    if (path !== window.location.pathname + window.location.search) {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3600);
  }, []);

  const refreshFavorites = useCallback(async (loggedUser: User | null) => {
    if (!loggedUser) {
      setFavoriteIds([]);
      return;
    }
    try {
      const res = await fetch('/api/account/favorites');
      if (res.ok) {
        const favs = (await res.json()) as Product[];
        setFavoriteIds(favs.map((f) => f.id));
      }
    } catch {
      // ignore
    }
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = (await res.json()) as { user: User | null };
        setUser(data.user);
        await refreshFavorites(data.user);
      }
    } catch {
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, [refreshFavorites]);

  const refreshStoreData = useCallback(async () => {
    try {
      const [catRes, brandRes, setRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/brands'),
        fetch('/api/settings'),
      ]);
      if (catRes.ok) {
        const cData = (await catRes.json()) as { flat: Category[]; tree: Category[] };
        setCategories(cData.flat);
        setCategoryTree(cData.tree);
      }
      if (brandRes.ok) {
        setBrands((await brandRes.json()) as Brand[]);
      }
      if (setRes.ok) {
        setSettings((await setRes.json()) as SiteSettings);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refreshAuth();
    refreshStoreData();
  }, [refreshAuth, refreshStoreData]);

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setFavoriteIds([]);
    notify('Vous êtes déconnecté.', 'info');
    if (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/compte')) {
      navigate('/');
    }
  }, [navigate, notify]);

  const addToCart = useCallback(
    (product: Product, quantity = 1, variantLabel = '') => {
      if (product.stock <= 0) {
        notify('Ce produit est actuellement en rupture de stock.', 'error');
        return;
      }
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => i.product_id === product.id && i.variant_label === variantLabel
        );
        if (idx >= 0) {
          const nextQty = Math.min(product.stock, prev[idx].quantity + quantity);
          const updated = [...prev];
          updated[idx] = { ...updated[idx], quantity: nextQty, stock: product.stock };
          return updated;
        }
        return [
          ...prev,
          {
            product_id: product.id,
            slug: product.slug,
            name: product.name,
            image: product.images[0] || '',
            unit_price_mad: product.effective_price_mad,
            quantity: Math.min(product.stock, quantity),
            variant_label: variantLabel,
            stock: product.stock,
          },
        ];
      });
      notify(`${product.name} ajouté au panier.`);
      setIsCartOpen(true);
    },
    [notify]
  );

  const updateCartQty = useCallback((productId: number, variantLabel: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => !(i.product_id === productId && i.variant_label === variantLabel)));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId && i.variant_label === variantLabel
          ? { ...i, quantity: Math.min(i.stock, quantity) }
          : i
      )
    );
  }, []);

  const removeFromCart = useCallback((productId: number, variantLabel: string) => {
    setCart((prev) => prev.filter((i) => !(i.product_id === productId && i.variant_label === variantLabel)));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleFavorite = useCallback(
    async (productId: number) => {
      if (!user) {
        notify('Connectez-vous pour enregistrer vos favoris.', 'info');
        navigate('/compte');
        return;
      }
      const isFav = favoriteIds.includes(productId);
      const res = await fetch(`/api/account/favorites/${productId}`, {
        method: isFav ? 'DELETE' : 'POST',
      });
      if (res.ok) {
        setFavoriteIds((prev) => (isFav ? prev.filter((id) => id !== productId) : [...prev, productId]));
        notify(isFav ? 'Retiré des favoris.' : 'Ajouté aux favoris.');
      }
    },
    [favoriteIds, navigate, notify, user]
  );

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.unit_price_mad * item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        user,
        authLoading,
        refreshAuth,
        logout,
        categories,
        categoryTree,
        brands,
        settings,
        refreshStoreData,
        cart,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        isSearchOpen,
        setIsSearchOpen,
        favoriteIds,
        toggleFavorite,
        notify,
        navigate,
        currentPath,
      }}
    >
      {children}

      {/* Accessible toast notifications */}
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto px-4 py-3 rounded-lg text-sm font-medium shadow-lg border transition-transform ${
              t.type === 'error'
                ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                : t.type === 'info'
                ? 'bg-[#0B192C] text-white border-[#1E293B]'
                : 'bg-white text-[#0F172A] border-[#CBD5E1]'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
