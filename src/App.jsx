import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '@/pages/Home/HomePage'; // asosiy sahifa — darhol yuklanadi
// Qolgan sahifalar lazy — kerak bo'lganda yuklanadi (bundle kichrayadi, tez ochiladi)
const RestaurantPage = lazy(() => import('@/pages/Restaurant/RestaurantPage').then((m) => ({ default: m.RestaurantPage })));
const CartPage = lazy(() => import('@/pages/Cart/CartPage').then((m) => ({ default: m.CartPage })));
const OrderTrackPage = lazy(() => import('@/pages/OrderTrack/OrderTrackPage').then((m) => ({ default: m.OrderTrackPage })));
const OrdersPage = lazy(() => import('@/pages/Orders/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const ReservationPage = lazy(() => import('@/pages/Reservation/ReservationPage').then((m) => ({ default: m.ReservationPage })));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SearchPage = lazy(() => import('@/pages/Stub/StubPages').then((m) => ({ default: m.SearchPage })));
const FavoritesPage = lazy(() => import('@/pages/Stub/StubPages').then((m) => ({ default: m.FavoritesPage })));
import { useUser } from '@/store/user';
import { authenticateWithTelegram, getStartParam } from '@/lib/telegram';
import { api } from '@/api';
import { I18nProvider } from '@/i18n';
import { ActiveOrderBadge } from '@/components/ActiveOrderBadge/ActiveOrderBadge';
import { SupportChat } from '@/components/SupportChat/SupportChat';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,        // 5 daqiqa "yangi" — keraksiz refetch bo'lmaydi
      gcTime: 30 * 60_000,          // 30 daqiqa cache saqlanadi (tez qaytish)
      refetchOnWindowFocus: false,   // fokusда qayta so'ramaydi
      refetchOnReconnect: true,      // internet tiklanганда yangilaydi
      retry: 2,                      // xatoда 2 marta qayta urinadi
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
    },
  },
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
          <Suspense fallback={<div className="app-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>}>
            <StartParamHandler />
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
          </Suspense>
          <FloatingLayer />
        </BrowserRouter>
      </QueryClientProvider>
    </I18nProvider>
  );
}

// Ulashilган havola bilan ochilганда (startapp=dish_ID) — o'sha taom restoraniga
// yo'naltiradi va taomни ochadi.
function StartParamHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const param = getStartParam();
    if (!param || param.type !== 'dish') return;
    let cancelled = false;
    api.getDish(param.id)
      .then((dish) => {
        if (cancelled || !dish) return;
        const rid = dish.restaurantId || dish.restaurant?.id;
        if (rid) {
          // Restoran sahifasига o'tamiz, taom highlight uchun state
          navigate(`/restaurant/${rid}`, { state: { highlightDish: param.id } });
        }
      })
      .catch(() => { /* topilmasa bosh sahifa qoladi */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function initialsOf(first, last) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'US';
}
