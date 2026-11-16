import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Boxes,
  FolderTree,
  LayoutDashboard,
  Lock,
  LogOut,
  Mail,
  Package,
  Percent,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Users,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import type { Category, Order, Product } from '../../types';
import { formatDateFr, formatDateTimeFr, formatMad } from '../../utils/format';
import { AdminProductModal } from './AdminProductModal';

type AdminSection =
  | 'dashboard'
  | 'products'
  | 'orders'
  | 'customers'
  | 'categories'
  | 'promotions'
  | 'inventory'
  | 'messages'
  | 'settings';

interface DashboardPayload {
  kpis: {
    revenue_mad: number;
    total_orders: number;
    total_customers: number;
    total_products: number;
    out_of_stock: number;
    pending_orders: number;
    delivered_orders: number;
    cancelled_orders: number;
  };
  sales_series: Array<{ day: string; orders_count: number; revenue_mad: number }>;
  top_products: Array<{
    id: number;
    name: string;
    sku: string;
    price_mad: number;
    stock: number;
    sales_count: number;
    category_name: string;
  }>;
  latest_orders: Order[];
  recent_activity: Array<{
    id: number;
    actor_role: string;
    action: string;
    entity_type: string;
    entity_id: string;
    created_at: string;
  }>;
}

interface AdminCustomerRow {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  is_suspended: number;
  created_at: string;
  orders_count: number;
  total_spent_mad: number;
}

interface PromoRow {
  id: number;
  name: string;
  code: string;
  discount_percent: number;
  starts_at: string;
  ends_at: string;
  is_active: number;
}

interface InventoryRow {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  delta: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  reference_id: string;
  created_at: string;
}

interface ContactRow {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  created_at: string;
}

export function AdminPage() {
  const { user, authLoading, refreshAuth, refreshStoreData, logout, notify, navigate } = useStore();
  const [section, setSection] = useState<AdminSection>('dashboard');

  // Admin Login Gate (NO hardcoded credentials in frontend)
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Forced initial password change state
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [showPwdForm, setShowPwdForm] = useState(false);

  // Data states
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promos, setPromos] = useState<PromoRow[]>([]);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [messages, setMessages] = useState<ContactRow[]>([]);
  const [adminSettings, setAdminSettings] = useState<Record<string, string>>({});

  // UI Helpers
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Category creation
  const [catName, setCatName] = useState('');
  const [catParentId, setCatParentId] = useState('');
  const [catImageUrl, setCatImageUrl] = useState('');

  // Promo creation
  const [promoName, setPromoName] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoPercent, setPromoPercent] = useState('10');
  const [promoDays, setPromoDays] = useState('30');

  // Stock adjustment
  const [stockProdId, setStockProdId] = useState('');
  const [stockDelta, setStockDelta] = useState('5');
  const [stockReason, setStockReason] = useState('Réapprovisionnement Casablanca');

  useEffect(() => {
    document.title = 'Administration — CasaTech Maroc';
  }, []);

  const loadSectionData = useCallback(async () => {
    if (!user || user.role !== 'admin') return;
    if (section === 'dashboard') {
      const r = await fetch('/api/admin/dashboard');
      if (r.ok) setDashboard((await r.json()) as DashboardPayload);
    } else if (section === 'products') {
      const r = await fetch('/api/admin/products');
      if (r.ok) setProducts((await r.json()) as Product[]);
    } else if (section === 'orders') {
      const r = await fetch('/api/admin/orders');
      if (r.ok) setOrders((await r.json()) as Order[]);
    } else if (section === 'customers') {
      const r = await fetch('/api/admin/customers');
      if (r.ok) setCustomers((await r.json()) as AdminCustomerRow[]);
    } else if (section === 'categories') {
      const r = await fetch('/api/admin/categories');
      if (r.ok) setCategories((await r.json()) as Category[]);
    } else if (section === 'promotions') {
      const r = await fetch('/api/admin/promotions');
      if (r.ok) setPromos((await r.json()) as PromoRow[]);
    } else if (section === 'inventory') {
      const [invR, prodR] = await Promise.all([
        fetch('/api/admin/inventory'),
        fetch('/api/admin/products'),
      ]);
      if (invR.ok) setInventory((await invR.json()) as InventoryRow[]);
      if (prodR.ok) {
        const pList = (await prodR.json()) as Product[];
        setProducts(pList);
        if (!stockProdId && pList[0]) setStockProdId(String(pList[0].id));
      }
    } else if (section === 'messages') {
      const r = await fetch('/api/admin/messages');
      if (r.ok) setMessages((await r.json()) as ContactRow[]);
    } else if (section === 'settings') {
      const r = await fetch('/api/admin/settings');
      if (r.ok) setAdminSettings((await r.json()) as Record<string, string>);
    }
  }, [section, stockProdId, user]);

  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json()) as { user?: { role: string }; error?: string };
      if (!res.ok) {
        notify(data.error || 'Échec de connexion.', 'error');
        return;
      }
      if (data.user?.role !== 'admin') {
        notify('Ce compte ne dispose pas des privilèges administrateur.', 'error');
        return;
      }
      await refreshAuth();
      notify('Accès administrateur vérifié.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/account/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: currPwd, new_password: newPwd }),
    });
    const data = (await res.json()) as { message?: string; error?: string };
    if (res.ok) {
      setCurrPwd('');
      setNewPwd('');
      setShowPwdForm(false);
      await refreshAuth();
      notify(data.message || 'Mot de passe administrateur mis à jour.');
    } else {
      notify(data.error || 'Erreur mot de passe.', 'error');
    }
  };

  const handleOrderStatus = async (orderId: number, status: Order['status']) => {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      notify(`Commande mise à jour (${status}).`);
      loadSectionData();
    } else {
      const err = (await res.json()) as { error?: string };
      notify(err.error || 'Erreur changement de statut.', 'error');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await fetch(`/api/admin/products/${id}`, { method: 'DELETE' });
    if (res.ok) {
      const data = (await res.json()) as { archived?: boolean };
      notify(data.archived ? 'Produit archivé (lié à des commandes).' : 'Produit supprimé.');
      loadSectionData();
    }
  };

  const handleToggleSuspend = async (cust: AdminCustomerRow) => {
    const res = await fetch(`/api/admin/customers/${cust.id}/suspend`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_suspended: cust.is_suspended === 0 }),
    });
    if (res.ok) {
      notify(cust.is_suspended === 0 ? 'Compte client suspendu.' : 'Compte client réactivé.');
      loadSectionData();
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: catName,
        parent_id: catParentId ? Number(catParentId) : null,
        image_url: catImageUrl,
        is_active: true,
      }),
    });
    if (res.ok) {
      setCatName('');
      setCatParentId('');
      setCatImageUrl('');
      await refreshStoreData();
      loadSectionData();
      notify('Catégorie enregistrée.');
    }
  };

  const handleToggleCategory = async (cat: Category) => {
    await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cat.name,
        parent_id: cat.parent_id,
        image_url: cat.image_url,
        description: cat.description,
        is_active: cat.is_active === 0,
      }),
    });
    await refreshStoreData();
    loadSectionData();
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const starts = new Date();
    const ends = new Date(starts.getTime() + Number(promoDays) * 24 * 60 * 60 * 1000);
    const res = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: promoName,
        code: promoCode,
        discount_percent: Number(promoPercent),
        product_ids: [],
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        is_active: true,
      }),
    });
    if (res.ok) {
      setPromoName('');
      setPromoCode('');
      loadSectionData();
      notify('Promotion créée.');
    } else {
      const err = (await res.json()) as { error?: string };
      notify(err.error || 'Erreur création promotion.', 'error');
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/inventory/adjust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: Number(stockProdId),
        delta: Number(stockDelta),
        reason: stockReason,
      }),
    });
    if (res.ok) {
      notify('Mouvement de stock enregistré.');
      loadSectionData();
    } else {
      const err = (await res.json()) as { error?: string };
      notify(err.error || 'Erreur ajustement.', 'error');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(adminSettings),
    });
    if (res.ok) {
      await refreshStoreData();
      notify('Paramètres du site sauvegardés.');
    }
  };

  if (authLoading) {
    return <div className="p-12 text-center text-sm text-[#64748B]">Vérification de session...</div>;
  }

  // Protected Admin Gate
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#F8FAFC]">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0B192C] text-white flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-[#0B192C]">Administration CasaTech</h1>
              <p className="text-xs text-[#64748B]">Accès restreint vérifié côté serveur</p>
            </div>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">
                Nom d&apos;utilisateur ou e-mail
              </label>
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Identifiant administrateur"
                className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#334155] mb-1">Mot de passe</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loggingIn}
              className="w-full h-11 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold"
            >
              {loggingIn ? 'Vérification...' : 'Accéder au tableau de bord'}
            </button>
          </form>

          <div className="pt-3 border-t border-[#F1F5F9] flex justify-between items-center text-xs">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[#475569] hover:text-[#0B192C]"
            >
              Retour à la boutique
            </button>
            <span className="text-[#94A3B8]">Session HttpOnly sécurisée</span>
          </div>
        </div>
      </div>
    );
  }

  const navLinks: Array<{ id: AdminSection; label: string; icon: typeof LayoutDashboard }> = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
    { id: 'products', label: 'Produits', icon: Package },
    { id: 'orders', label: 'Commandes', icon: ShoppingBag },
    { id: 'customers', label: 'Clients', icon: Users },
    { id: 'categories', label: 'Catégories', icon: FolderTree },
    { id: 'promotions', label: 'Promotions', icon: Percent },
    { id: 'inventory', label: 'Stocks', icon: Boxes },
    { id: 'messages', label: 'Messages', icon: Mail },
    { id: 'settings', label: 'Paramètres', icon: Settings },
  ];

  const maxRevenue = Math.max(
    1,
    ...(dashboard?.sales_series.map((s) => Number(s.revenue_mad)) || [1])
  );

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const filteredCustomers = customers.filter(
    (c) =>
      c.full_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="w-full lg:w-64 bg-[#0B192C] text-white shrink-0 flex flex-col">
        <div className="px-6 py-5 border-b border-[#1E293B] flex items-center justify-between">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            className="font-display text-lg font-bold tracking-tight"
          >
            CasaTech Admin
          </a>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setSection(item.id)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 transition-colors ${
                  active
                    ? 'bg-[#1D4ED8] text-white'
                    : 'text-[#CBD5E1] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 border-t border-[#1E293B] hidden lg:flex items-center justify-between text-xs text-[#94A3B8]">
          <span className="truncate">{user.full_name}</span>
          <button type="button" onClick={logout} title="Déconnexion" className="hover:text-white p-1">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 space-y-6">
        {/* Top Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E2E8F0]">
          <div className="text-sm text-[#64748B]">
            Administration <span aria-hidden="true">/</span>{' '}
            <span className="font-semibold text-[#0B192C]">
              {navLinks.find((n) => n.id === section)?.label}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#0B192C]"
            >
              Voir la boutique
            </button>
            <button
              type="button"
              onClick={logout}
              className="lg:hidden px-3.5 py-2 rounded-lg border border-[#CBD5E1] bg-white text-xs font-semibold text-[#DC2626]"
            >
              Déconnexion
            </button>
          </div>
        </div>

        {/* Security Alert for Initial Demo Password */}
        {user.must_change_password === 1 && (
          <div className="bg-[#FEF3C7] border border-[#F59E0B] rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm font-semibold text-[#92400E]">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  Sécurité : Le mot de passe administrateur initial doit être modifié avant toute mise en
                  production.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPwdForm(!showPwdForm)}
                className="px-3.5 py-1.5 rounded-lg bg-[#92400E] text-white text-xs font-semibold"
              >
                {showPwdForm ? 'Fermer' : 'Changer le mot de passe'}
              </button>
            </div>
            {showPwdForm && (
              <form onSubmit={handlePasswordUpdate} className="flex flex-wrap gap-2 pt-2">
                <input
                  type="password"
                  required
                  value={currPwd}
                  onChange={(e) => setCurrPwd(e.target.value)}
                  placeholder="Mot de passe actuel"
                  className="h-9 px-3 rounded-lg border border-[#D97706] bg-white text-xs"
                />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  placeholder="Nouveau mot de passe (8+ car.)"
                  className="h-9 px-3 rounded-lg border border-[#D97706] bg-white text-xs"
                />
                <button
                  type="submit"
                  className="h-9 px-4 rounded-lg bg-[#0B192C] text-white text-xs font-semibold"
                >
                  Valider
                </button>
              </form>
            )}
          </div>
        )}

        {/* 1. DASHBOARD */}
        {section === 'dashboard' && dashboard && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Chiffre d'affaires", val: formatMad(dashboard.kpis.revenue_mad) },
                { label: 'Commandes totales', val: String(dashboard.kpis.total_orders) },
                { label: 'Clients inscrits', val: String(dashboard.kpis.total_customers) },
                { label: 'Produits actifs', val: String(dashboard.kpis.total_products) },
                { label: 'Ruptures de stock', val: String(dashboard.kpis.out_of_stock), warn: dashboard.kpis.out_of_stock > 0 },
                { label: 'Commandes en attente', val: String(dashboard.kpis.pending_orders) },
                { label: 'Commandes livrées', val: String(dashboard.kpis.delivered_orders) },
                { label: 'Commandes annulées', val: String(dashboard.kpis.cancelled_orders) },
              ].map((kpi) => (
                <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-xl p-5">
                  <div className="text-xs font-medium text-[#64748B]">{kpi.label}</div>
                  <div
                    className={`mt-2 text-2xl font-bold font-mono tabular-nums ${
                      kpi.warn ? 'text-[#DC2626]' : 'text-[#0B192C]'
                    }`}
                  >
                    {kpi.val}
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue Chart + Top Products */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#0B192C] flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#1D4ED8]" />
                    <span>Évolution du chiffre d&apos;affaires (données réelles)</span>
                  </h2>
                </div>
                {dashboard.sales_series.length === 0 ? (
                  <p className="text-sm text-[#64748B] py-12 text-center">Aucune vente enregistrée.</p>
                ) : (
                  <div className="h-56 flex items-end gap-3 pt-6 pb-2 border-b border-[#F1F5F9]">
                    {dashboard.sales_series.map((s) => {
                      const pct = Math.max(8, Math.round((Number(s.revenue_mad) / maxRevenue) * 100));
                      return (
                        <div key={s.day} className="flex-1 flex flex-col items-center gap-1.5 min-w-[36px]">
                          <div className="text-[10px] font-mono tabular-nums text-[#475569]">
                            {Math.round(Number(s.revenue_mad) / 1000)}k
                          </div>
                          <div className="w-full bg-[#EFF6FF] rounded-t-md h-36 flex items-end overflow-hidden">
                            <div
                              style={{ height: `${pct}%` }}
                              className="w-full bg-[#1D4ED8] rounded-t-md transition-all"
                              title={`${s.day} : ${formatMad(s.revenue_mad)} (${s.orders_count} cmd)`}
                            />
                          </div>
                          <div className="text-[10px] font-mono text-[#64748B] truncate max-w-full">
                            {s.day.slice(5)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <h2 className="font-display text-base font-bold text-[#0B192C]">Produits les plus vendus</h2>
                <div className="divide-y divide-[#F1F5F9]">
                  {dashboard.top_products.map((p) => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#0F172A] truncate">{p.name}</div>
                        <div className="text-xs text-[#64748B] font-mono">{p.sku}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono tabular-nums font-semibold text-[#0B192C]">
                          {p.sales_count} vendus
                        </div>
                        <div className="text-xs text-[#64748B] font-mono tabular-nums">
                          Stock: {p.stock}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Latest Orders & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 overflow-x-auto">
                <h2 className="font-display text-base font-bold text-[#0B192C] mb-4">Dernières commandes</h2>
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-xs text-[#64748B]">
                      <th className="pb-2">N°</th>
                      <th className="pb-2">Client</th>
                      <th className="pb-2">Statut</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {dashboard.latest_orders.map((o) => (
                      <tr key={o.id} className="h-10">
                        <td className="font-mono text-xs font-semibold">{o.order_number}</td>
                        <td className="text-[#0F172A]">{o.customer_name}</td>
                        <td className="text-xs font-medium text-[#1D4ED8]">{o.status}</td>
                        <td className="text-right font-mono tabular-nums font-semibold">
                          {formatMad(o.total_mad)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6">
                <h2 className="font-display text-base font-bold text-[#0B192C] mb-4">Activité récente</h2>
                <div className="divide-y divide-[#F1F5F9] text-xs">
                  {dashboard.recent_activity.map((act) => (
                    <div key={act.id} className="py-2.5 flex items-center justify-between gap-2">
                      <span className="font-medium text-[#334155]">
                        {act.action} · {act.entity_type} #{act.entity_id}
                      </span>
                      <span className="font-mono text-[#64748B] shrink-0">
                        {formatDateTimeFr(act.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. PRODUCTS */}
        {section === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Rechercher produit ou SKU..."
                  className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#CBD5E1] bg-white text-sm"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingProduct(null);
                  setProductModalOpen(true);
                }}
                className="h-10 px-4 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un produit</span>
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Produit</th>
                    <th className="py-3 px-4">Catégorie</th>
                    <th className="py-3 px-4 text-right">Prix MAD</th>
                    <th className="py-3 px-4 text-right">Stock</th>
                    <th className="py-3 px-4">État</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono text-xs text-[#475569]">{p.sku}</td>
                      <td className="py-3 px-4 font-semibold text-[#0F172A]">{p.name}</td>
                      <td className="py-3 px-4 text-xs text-[#64748B]">{p.category_name}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatMad(p.effective_price_mad)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                          p.stock === 0 ? 'text-[#DC2626]' : 'text-[#0B192C]'
                        }`}
                      >
                        {p.stock}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {p.is_published ? 'Publié' : 'Archivé'}
                      </td>
                      <td className="py-3 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingProduct(p);
                            setProductModalOpen(true);
                          }}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p.id)}
                          className="text-xs font-semibold text-[#DC2626] hover:underline inline-flex items-center gap-0.5"
                        >
                          <Archive className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. ORDERS */}
        {section === 'orders' && (
          <div className="space-y-4">
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                    <th className="py-3 px-4">N° Commande</th>
                    <th className="py-3 px-4">Client</th>
                    <th className="py-3 px-4">Téléphone</th>
                    <th className="py-3 px-4">Ville</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Montant</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Détails</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#0B192C]">
                        {o.order_number}
                      </td>
                      <td className="py-3 px-4">{o.customer_name}</td>
                      <td className="py-3 px-4 font-mono text-xs">{o.customer_phone}</td>
                      <td className="py-3 px-4 text-xs">{o.city}</td>
                      <td className="py-3 px-4 text-xs text-[#64748B]">{formatDateFr(o.created_at)}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatMad(o.total_mad)}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={o.status}
                          onChange={(e) => handleOrderStatus(o.id, e.target.value as Order['status'])}
                          className="h-8 px-2 rounded border border-[#CBD5E1] bg-white text-xs font-medium"
                        >
                          {['En attente', 'Confirmée', 'En préparation', 'Expédiée', 'Livrée', 'Annulée'].map(
                            (st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(o)}
                          className="text-xs font-semibold text-[#1D4ED8] hover:underline"
                        >
                          Voir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedOrder && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-[#F1F5F9] pb-3">
                  <h3 className="font-display font-bold text-[#0B192C]">
                    Commande {selectedOrder.order_number} — {selectedOrder.customer_name}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="text-xs font-semibold text-[#64748B]"
                  >
                    Fermer
                  </button>
                </div>
                <div className="text-xs text-[#475569] space-y-1">
                  <div>
                    Adresse : {selectedOrder.shipping_address}, {selectedOrder.neighborhood},{' '}
                    {selectedOrder.city}
                  </div>
                  <div>
                    Livraison : {selectedOrder.delivery_method} · Paiement : {selectedOrder.payment_method}
                  </div>
                </div>
                {selectedOrder.items && (
                  <div className="divide-y divide-[#F1F5F9] text-sm">
                    {selectedOrder.items.map((it) => (
                      <div key={it.id} className="py-2 flex justify-between">
                        <span>
                          {it.product_name} × {it.quantity} ({it.sku})
                        </span>
                        <span className="font-mono tabular-nums font-semibold">
                          {formatMad(it.line_total_mad)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 4. CUSTOMERS */}
        {section === 'customers' && (
          <div className="space-y-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Rechercher client..."
                className="w-full h-10 pl-9 pr-3 rounded-lg border border-[#CBD5E1] bg-white text-sm"
              />
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                    <th className="py-3 px-4">Nom</th>
                    <th className="py-3 px-4">E-mail</th>
                    <th className="py-3 px-4">Téléphone</th>
                    <th className="py-3 px-4">Ville</th>
                    <th className="py-3 px-4 text-right">Commandes</th>
                    <th className="py-3 px-4 text-right">Dépensé</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {filteredCustomers.map((c) => (
                    <tr key={c.id}>
                      <td className="py-3 px-4 font-semibold">{c.full_name}</td>
                      <td className="py-3 px-4 text-xs">{c.email}</td>
                      <td className="py-3 px-4 font-mono text-xs">{c.phone}</td>
                      <td className="py-3 px-4 text-xs">{c.city}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">{c.orders_count}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                        {formatMad(c.total_spent_mad)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(c)}
                          className={`text-xs font-semibold ${
                            c.is_suspended === 1 ? 'text-[#15803D]' : 'text-[#DC2626]'
                          }`}
                        >
                          {c.is_suspended === 1 ? 'Réactiver' : 'Suspendre'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 5. CATEGORIES */}
        {section === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleCreateCategory}
              className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 self-start"
            >
              <h2 className="font-display text-base font-bold text-[#0B192C]">
                Ajouter catégorie / sous-catégorie
              </h2>
              <input
                type="text"
                required
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Nom (ex. Montres connectées)"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
              />
              <select
                value={catParentId}
                onChange={(e) => setCatParentId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm"
              >
                <option value="">Catégorie principale</option>
                {categories
                  .filter((c) => c.parent_id === null)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      Sous-catégorie de : {p.name}
                    </option>
                  ))}
              </select>
              <input
                type="text"
                value={catImageUrl}
                onChange={(e) => setCatImageUrl(e.target.value)}
                placeholder="URL image (optionnel)"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
              />
              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold"
              >
                Créer
              </button>
            </form>

            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                    <th className="py-3 px-4">Nom</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Statut</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-4 font-medium">{c.name}</td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B]">
                        {c.parent_id ? 'Sous-catégorie' : 'Principale'}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {c.is_active === 1 ? 'Active' : 'Désactivée'}
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(c)}
                          className="text-xs font-semibold text-[#1D4ED8]"
                        >
                          {c.is_active === 1 ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 6. PROMOTIONS */}
        {section === 'promotions' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleCreatePromo}
              className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 self-start"
            >
              <h2 className="font-display text-base font-bold text-[#0B192C]">Créer une promotion</h2>
              <input
                type="text"
                required
                value={promoName}
                onChange={(e) => setPromoName(e.target.value)}
                placeholder="Nom de l'offre"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
              />
              <input
                type="text"
                required
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                placeholder="Code promo (ex. RAMADAN15)"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono text-sm uppercase"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#64748B] mb-1">Réduction (%)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="90"
                    value={promoPercent}
                    onChange={(e) => setPromoPercent(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#64748B] mb-1">Durée (jours)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={promoDays}
                    onChange={(e) => setPromoDays(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono text-sm"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-[#1D4ED8] text-white text-xs font-semibold"
              >
                Activer la promotion
              </button>
            </form>

            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                    <th className="py-3 px-4">Offre</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4 text-right">Remise</th>
                    <th className="py-3 px-4">Fin</th>
                    <th className="py-3 px-4 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {promos.map((pr) => (
                    <tr key={pr.id}>
                      <td className="py-3 px-4 font-medium">{pr.name}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#1D4ED8]">{pr.code}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">-{pr.discount_percent}%</td>
                      <td className="py-3 px-4 text-xs text-[#64748B]">{formatDateFr(pr.ends_at)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch(`/api/admin/promotions/${pr.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ is_active: pr.is_active === 0 }),
                            });
                            loadSectionData();
                          }}
                          className="text-xs font-semibold text-[#0B192C]"
                        >
                          {pr.is_active === 1 ? 'Désactiver' : 'Activer'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 7. INVENTORY */}
        {section === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleAdjustStock}
              className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 self-start"
            >
              <h2 className="font-display text-base font-bold text-[#0B192C]">Ajustement de stock</h2>
              <select
                value={stockProdId}
                onChange={(e) => setStockProdId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] bg-white text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock actuel : {p.stock})
                  </option>
                ))}
              </select>
              <input
                type="number"
                required
                value={stockDelta}
                onChange={(e) => setStockDelta(e.target.value)}
                placeholder="Variation (+5 ou -2)"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] font-mono text-sm"
              />
              <input
                type="text"
                required
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Motif"
                className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
              />
              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-[#0B192C] text-white text-xs font-semibold"
              >
                Enregistrer le mouvement
              </button>
            </form>

            <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs text-[#64748B]">
                    <th className="py-3 px-4">Produit</th>
                    <th className="py-3 px-4">Motif</th>
                    <th className="py-3 px-4 text-right">Variation</th>
                    <th className="py-3 px-4 text-right">Nouveau stock</th>
                    <th className="py-3 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {inventory.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 px-4 font-medium">{m.product_name}</td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B]">{m.reason}</td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono tabular-nums font-bold ${
                          m.delta > 0 ? 'text-[#15803D]' : 'text-[#DC2626]'
                        }`}
                      >
                        {m.delta > 0 ? `+${m.delta}` : m.delta}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums">{m.new_stock}</td>
                      <td className="py-2.5 px-4 text-right text-xs text-[#64748B]">
                        {formatDateTimeFr(m.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 8. MESSAGES */}
        {section === 'messages' && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center text-sm text-[#64748B]">
                Aucun message reçu via le formulaire de contact.
              </div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-2">
                  <div className="flex justify-between text-xs text-[#64748B]">
                    <span className="font-semibold text-[#0B192C] text-sm">
                      {m.subject} — {m.full_name} ({m.email})
                    </span>
                    <span>{formatDateTimeFr(m.created_at)}</span>
                  </div>
                  <p className="text-sm text-[#334155]">{m.message}</p>
                </div>
              ))
            )}
          </div>
        )}

        {/* 9. SETTINGS */}
        {section === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5 max-w-3xl">
            <h2 className="font-display text-lg font-bold text-[#0B192C]">Paramètres du site</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                { key: 'store_name', label: 'Nom de la boutique' },
                { key: 'slogan', label: 'Slogan' },
                { key: 'contact_email', label: 'E-mail de contact' },
                { key: 'contact_phone', label: 'Téléphone' },
                { key: 'whatsapp_number', label: 'Numéro WhatsApp' },
                { key: 'casablanca_shipping_fee', label: 'Frais livraison Casablanca (MAD)' },
                { key: 'other_cities_shipping_fee', label: 'Frais autres villes (MAD)' },
                { key: 'free_shipping_threshold', label: 'Seuil livraison gratuite (MAD)' },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">{f.label}</label>
                  <input
                    type="text"
                    value={adminSettings[f.key] || ''}
                    onChange={(e) => setAdminSettings((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1]"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#334155] mb-1">Adresse boutique</label>
                <input
                  type="text"
                  value={adminSettings.store_address || ''}
                  onChange={(e) =>
                    setAdminSettings((prev) => ({ ...prev, store_address: e.target.value }))
                  }
                  className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#334155] mb-1">Titre bannière accueil</label>
                <input
                  type="text"
                  value={adminSettings.hero_title || ''}
                  onChange={(e) => setAdminSettings((prev) => ({ ...prev, hero_title: e.target.value }))}
                  className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-[#334155]">
                  <input
                    type="checkbox"
                    checked={adminSettings.pickup_enabled === 'true'}
                    onChange={(e) =>
                      setAdminSettings((prev) => ({
                        ...prev,
                        pickup_enabled: e.target.checked ? 'true' : 'false',
                      }))
                    }
                  />
                  <span>Activer le retrait en boutique à Casablanca</span>
                </label>
              </div>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold"
            >
              Enregistrer les paramètres
            </button>
          </form>
        )}
      </main>

      {productModalOpen && (
        <AdminProductModal
          product={editingProduct}
          onClose={() => setProductModalOpen(false)}
          onSaved={() => {
            setProductModalOpen(false);
            loadSectionData();
          }}
        />
      )}
    </div>
  );
}
