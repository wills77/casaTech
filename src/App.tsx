import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { WhatsAppButton } from './components/WhatsAppButton';
import { StoreProvider, useStore } from './context/StoreContext';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/admin/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';
import { ContactPage, LegalPage, NotFoundPage } from './pages/StaticPages';

function AppRouter() {
  const { currentPath } = useStore();
  const pathname = currentPath.split('?')[0].split('#')[0];

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return <AdminPage />;
  }

  let pageNode: React.ReactNode;
  if (pathname === '/' || pathname === '') {
    pageNode = <HomePage />;
  } else if (pathname === '/boutique') {
    pageNode = <ShopPage />;
  } else if (pathname.startsWith('/produit/')) {
    const slug = decodeURIComponent(pathname.replace('/produit/', ''));
    pageNode = <ProductDetailPage slug={slug} />;
  } else if (pathname === '/commander') {
    pageNode = <CheckoutPage />;
  } else if (pathname === '/compte') {
    pageNode = <AccountPage />;
  } else if (pathname === '/contact') {
    pageNode = <ContactPage />;
  } else if (pathname === '/conditions-generales') {
    pageNode = <LegalPage type="terms" />;
  } else if (pathname === '/confidentialite') {
    pageNode = <LegalPage type="privacy" />;
  } else {
    pageNode = <NotFoundPage />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <Header />
      <main className="flex-1">{pageNode}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <AppRouter />
    </StoreProvider>
  );
}
