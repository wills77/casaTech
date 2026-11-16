import { useEffect, useState } from 'react';
import { Heart, LogOut, MapPin, Package, Plus, Trash2, User as UserIcon } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import type { Address, Order, Product } from '../types';
import { formatDateFr, formatMad } from '../utils/format';

type AccountTab = 'orders' | 'profile' | 'addresses' | 'favorites' | 'security';

export function AccountPage() {
  const { user, authLoading, refreshAuth, logout, notify, navigate } = useStore();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [activeTab, setActiveTab] = useState<AccountTab>('orders');

  // Auth forms
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regCity, setRegCity] = useState('Casablanca');
  const [regPassword, setRegPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);

  // Account data
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');

  // Address form
  const [addrLabel, setAddrLabel] = useState('Domicile');
  const [addrCity, setAddrCity] = useState('Casablanca');
  const [addrHood, setAddrHood] = useState('');
  const [addrStreet, setAddrStreet] = useState('');

  // Password change
  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');

  useEffect(() => {
    document.title = 'Espace Client — CasaTech Maroc';
  }, []);

  useEffect(() => {
    if (!user) return;
    setProfileName(user.full_name);
    setProfilePhone(user.phone);
    Promise.all([
      fetch('/api/account/orders').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/account/addresses').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/account/favorites').then((r) => (r.ok ? r.json() : [])),
    ]).then(([ord, addr, fav]) => {
      setOrders(ord as Order[]);
      setAddresses(addr as Address[]);
      setFavorites(fav as Product[]);
    });
  }, [user]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: loginIdentifier, password: loginPassword }),
      });
      const data = (await res.json()) as { user?: { role: string }; error?: string };
      if (!res.ok) {
        notify(data.error || 'Connexion impossible.', 'error');
        return;
      }
      await refreshAuth();
      notify('Connexion réussie.');
      if (data.user?.role === 'admin') {
        navigate('/admin');
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthBusy(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: regName,
          email: regEmail,
          phone: regPhone,
          city: regCity,
          password: regPassword,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        notify(data.error || 'Inscription impossible.', 'error');
        return;
      }
      await refreshAuth();
      notify('Compte CasaTech créé avec succès.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ full_name: profileName, phone: profilePhone }),
    });
    if (res.ok) {
      await refreshAuth();
      notify('Profil mis à jour.');
    } else {
      notify('Erreur lors de la mise à jour.', 'error');
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const res = await fetch('/api/account/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: addrLabel,
        full_name: user.full_name,
        phone: user.phone || '+212 600 00 00 00',
        city: addrCity,
        neighborhood: addrHood,
        street_address: addrStreet,
        is_default: addresses.length === 0,
      }),
    });
    if (res.ok) {
      const created = (await res.json()) as Address;
      setAddresses((prev) => [created, ...prev]);
      setAddrHood('');
      setAddrStreet('');
      notify('Adresse ajoutée.');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      notify('Adresse supprimée.', 'info');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
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
      notify(data.message || 'Mot de passe modifié.');
    } else {
      notify(data.error || 'Erreur mot de passe.', 'error');
    }
  };

  if (authLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-sm text-[#64748B]">Chargement...</div>;
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-14">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex gap-1 p-1 bg-[#F1F5F9] rounded-lg">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                authMode === 'login' ? 'bg-white text-[#0B192C] shadow-sm' : 'text-[#64748B]'
              }`}
            >
              Se connecter
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${
                authMode === 'register' ? 'bg-white text-[#0B192C] shadow-sm' : 'text-[#64748B]'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <h1 className="font-display text-xl font-bold text-[#0B192C]">Connexion Client</h1>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  E-mail ou identifiant
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="client@exemple.ma"
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Mot de passe</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full h-11 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold"
              >
                {authBusy ? 'Connexion...' : 'Se connecter'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <h1 className="font-display text-xl font-bold text-[#0B192C]">Créer un compte CasaTech</h1>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Téléphone</label>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+212 6..."
                    className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#334155] mb-1">Ville</label>
                  <input
                    type="text"
                    required
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Mot de passe (8 caractères min.)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={authBusy}
                className="w-full h-11 rounded-lg bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-semibold"
              >
                {authBusy ? 'Création...' : 'Créer mon compte'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B192C]">Bonjour, {user.full_name}</h1>
          <p className="text-sm text-[#64748B]">{user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          {user.role === 'admin' && (
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-4 py-2 rounded-lg bg-[#0B192C] text-white text-xs font-semibold"
            >
              Ouvrir Admin
            </button>
          )}
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-lg border border-[#CBD5E1] text-xs font-semibold text-[#334155] hover:bg-[#F8FAFC] inline-flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 space-y-1">
          {[
            { id: 'orders', label: 'Mes commandes', icon: Package },
            { id: 'profile', label: 'Informations personnelles', icon: UserIcon },
            { id: 'addresses', label: 'Mes adresses', icon: MapPin },
            { id: 'favorites', label: 'Mes favoris', icon: Heart },
            { id: 'security', label: 'Mot de passe', icon: UserIcon },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as AccountTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold'
                    : 'text-[#475569] hover:bg-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="lg:col-span-9">
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-bold text-[#0B192C]">
                Historique et suivi des commandes ({orders.length})
              </h2>
              {orders.length === 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center text-sm text-[#64748B]">
                  Vous n&apos;avez pas encore passé de commande.
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F1F5F9]">
                      <div>
                        <div className="font-mono font-bold text-[#0B192C] text-sm">
                          {order.order_number}
                        </div>
                        <div className="text-xs text-[#64748B]">
                          Passée le {formatDateFr(order.created_at)} · {order.delivery_method}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-[#1D4ED8]">{order.status}</div>
                        <div className="font-mono tabular-nums font-bold text-[#0B192C] text-sm">
                          {formatMad(order.total_mad)}
                        </div>
                      </div>
                    </div>
                    {order.items && (
                      <div className="space-y-1.5 text-sm">
                        {order.items.map((it) => (
                          <div key={it.id} className="flex justify-between text-[#334155]">
                            <span>
                              {it.product_name} × {it.quantity}{' '}
                              {it.variant_label ? `(${it.variant_label})` : ''}
                            </span>
                            <span className="font-mono tabular-nums">{formatMad(it.line_total_mad)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleUpdateProfile} className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 max-w-lg">
              <h2 className="font-display text-lg font-bold text-[#0B192C]">Informations personnelles</h2>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Téléphone</label>
                <input
                  type="tel"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold"
              >
                Enregistrer les modifications
              </button>
            </form>
          )}

          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <form onSubmit={handleAddAddress} className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#0B192C]">Ajouter une adresse</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    placeholder="Libellé (Domicile, Bureau)"
                    className="h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
                  />
                  <input
                    type="text"
                    required
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    placeholder="Ville"
                    className="h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
                  />
                  <input
                    type="text"
                    value={addrHood}
                    onChange={(e) => setAddrHood(e.target.value)}
                    placeholder="Quartier"
                    className="h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
                  />
                </div>
                <input
                  type="text"
                  required
                  value={addrStreet}
                  onChange={(e) => setAddrStreet(e.target.value)}
                  placeholder="Adresse complète"
                  className="w-full h-10 px-3 rounded-lg border border-[#CBD5E1] text-sm"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-[#0B192C] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Enregistrer cette adresse</span>
                </button>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((a) => (
                  <div key={a.id} className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex justify-between items-start">
                    <div className="text-sm">
                      <div className="font-semibold text-[#0B192C]">{a.label}</div>
                      <div className="text-[#475569] mt-1">{a.street_address}</div>
                      <div className="text-xs text-[#64748B] mt-0.5">
                        {a.neighborhood ? `${a.neighborhood}, ` : ''}
                        {a.city}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAddress(a.id)}
                      className="text-[#94A3B8] hover:text-[#DC2626] p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B192C] mb-4">
                Produits favoris ({favorites.length})
              </h2>
              {favorites.length === 0 ? (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center text-sm text-[#64748B]">
                  Aucun favori enregistré pour l&apos;instant.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {favorites.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handlePasswordChange} className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4 max-w-lg">
              <h2 className="font-display text-lg font-bold text-[#0B192C]">Modifier le mot de passe</h2>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  required
                  value={currPwd}
                  onChange={(e) => setCurrPwd(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  Nouveau mot de passe (8 caractères min.)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPwd}
                  onChange={(e) => setNewPwd(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-lg border border-[#CBD5E1] text-sm"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-lg bg-[#1D4ED8] text-white text-sm font-semibold"
              >
                Mettre à jour le mot de passe
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
