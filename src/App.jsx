import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '@/pages/Home/HomePage';
import { RestaurantPage } from '@/pages/Restaurant/RestaurantPage';
import { CartPage } from '@/pages/Cart/CartPage';
import { OrderTrackPage } from '@/pages/OrderTrack/OrderTrackPage';
import { OrdersPage } from '@/pages/Orders/OrdersPage';
import { ReservationPage } from '@/pages/Reservation/ReservationPage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';
import { SearchPage, FavoritesPage } from '@/pages/Stub/StubPages';
import { useUser } from '@/store/user';
import { authenticateWithTelegram } from '@/lib/telegram';
import { I18nProvider } from '@/i18n';
import { ActiveOrderBadge } from '@/components/ActiveOrderBadge/ActiveOrderBadge';
import { SupportChat } from '@/components/SupportChat/SupportChat';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

// Global suzuvchi elementlar (badge + chat) — ba'zi sahifalarda yashiriladi
function FloatingLayer() {
  const location = useLocation();
  // Savatcha va kuzatuv sahifalarida chat/badge ko'rsatmaymiz (joy band)
  const hideChat = ['/cart', '/order/track'].includes(location.pathname);
  return (
    <>
      <ActiveOrderBadge />
      {!hideChat && <SupportChat />}
    </>
  );
}

export default function App() {
  const updateUser = useUser((s) => s.updateUser);
  const setAuthStatus = useUser((s) => s.setAuthStatus);
  const currentUser = useUser((s) => s.user);

  useEffect(() => {
    authenticateWithTelegram()
      .then((profile) => {
        updateUser({
          telegramId: profile.telegramId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          username: profile.username,
          languageCode: profile.languageCode,
          isPremium: profile.isPremium,
          photoUrl: profile.photoUrl,
          photoInitials: initialsOf(profile.firstName, profile.lastName),
          phone: currentUser.phone ?? profile.phone ?? null,
          addresses: currentUser.addresses.length ? currentUser.addresses : profile.addresses ?? [],
          verified: true,
        });
        setAuthStatus('done');
      })
      .catch((err) => {
        console.warn('Telegram auth muvaffaqiyatsiz, mehmon rejimida davom etiladi:', err);
        setAuthStatus('failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/restaurant/:id" element={<RestaurantPage />} />
            <Route path="/restaurant/:id/reserve" element={<ReservationPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/order/track" element={<OrderTrackPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
          <FloatingLayer />
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  );
}

function initialsOf(first, last) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'US';
}
