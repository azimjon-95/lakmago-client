import { useEffect, useRef, useState, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '@/pages/Home/HomePage'; // asosiy sahifa — darhol yuklanadi
// Qolgan sahifalar lazy — kerak bo'lganda yuklanadi (bundle kichrayadi, tez ochiladi)
const RestaurantPage = lazy(() => import('@/pages/Restaurant/RestaurantPage').then((m) => ({ default: m.RestaurantPage })));
const CartPage = lazy(() => import('@/pages/Cart/CartPage').then((m) => ({ default: m.CartPage })));
const OrderTrackPage = lazy(() => import('@/pages/OrderTrack/OrderTrackPage').then((m) => ({ default: m.OrderTrackPage })));
const OrdersPage = lazy(() => import('@/pages/Orders/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const FoodPage = lazy(() => import('@/pages/Food/FoodPage').then((m) => ({ default: m.FoodPage })));
const CardsPage = lazy(() => import('@/pages/Cards/CardsPage').then((m) => ({ default: m.CardsPage })));
const FavoritesPage = lazy(() => import('@/pages/Favorites/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const MyReservationsPage = lazy(() => import('@/pages/Reservation/MyReservationsPage').then((m) => ({ default: m.MyReservationsPage })));
const ReservationPage = lazy(() => import('@/pages/Reservation/ReservationPage').then((m) => ({ default: m.ReservationPage })));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SearchPage = lazy(() => import('@/pages/Search/SearchPage').then((m) => ({ default: m.SearchPage })));
import { useUser } from '@/store/user';
import { authenticateWithTelegram, getStartParam, isTelegramEnv } from '@/lib/telegram';
import { TelegramOnly } from '@/components/TelegramOnly/TelegramOnly';
import { api, getAuthToken } from '@/api';
import { joinUserRoom } from '@/lib/socket';
import { I18nProvider } from '@/i18n';
import { ActiveOrderBadge } from '@/components/ActiveOrderBadge/ActiveOrderBadge';
import { SupportChat } from '@/components/SupportChat/SupportChat';
import { SubscriptionGate } from '@/components/SubscriptionGate/SubscriptionGate';
import { Splash } from '@/components/Splash/Splash';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,        // 5 daqiqa "yangi" — keraksiz refetch bo'lmaydi
      gcTime: 30 * 60_000,          // 30 daqiqa cache saqlanadi (tez qaytish)
      refetchOnWindowFocus: false,   // fokusda qayta so'ramaydi
      refetchOnReconnect: true,      // internet tiklanganda yangilaydi
      retry: 2,                      // xatoda 2 marta qayta urinadi
      retryDelay: (n) => Math.min(1000 * 2 ** n, 8000),
    },
  },
});

// Global suzuvchi elementlar (buyurtma nishoni + chat) — faqat
// bosh sahifada ko'rinadi, ichki sahifalarda (restoran, savat,
// bron, qidiruv va h.k.) umuman chiqmaydi.
function FloatingLayer() {
  const location = useLocation();
  const isHome = location.pathname === '/';
  return (
    <>
      {isHome && <ActiveOrderBadge />}
      {isHome && <SupportChat />}
    </>
  );
}

export default function App() {
  /*
   * I18nProvider ENDI TelegramOnly'ni HAM o'rab oladi.
   *
   * ILGARI: App() Telegram muhitidan tashqarida bo'lsa
   * to'g'ridan-to'g'ri <TelegramOnly /> qaytarardi,
   * I18nProvider esa faqat AppInner() ICHIDA edi. Natijada
   * TelegramOnly useT() ni CHAQIRA OLMASDI (I18nProvider
   * mount bo'lmagan bosqichda) - shuning uchun u butunlay
   * qattiq yozilgan matn bilan qolgan edi, til hech qachon
   * o'zgarmasdi.
   *
   * AUTH FUNDAMENTI (2-bosqich): brauzerda (Telegram tashqarisida)
   * ilova endi ikki holatga ega:
   *  - webLoggedIn=false — TelegramOnly (Login Widget bilan kirish
   *    imkoniyati)
   *  - webLoggedIn=true — AppInner, xuddi Mini App bilan bir xil
   *    tajriba (faqat authMode='web', pastga qarang)
   * Sahifa YANGILANGANDA ham holat saqlanadi — accessToken
   * localStorage/sessionStorage'da bo'lsa (Login Widget orqali
   * avval kirilgan bo'lsa), boshlang'ich holat darhol "kirilgan"
   * deb hisoblanadi, foydalanuvchi qayta login qilishga majbur
   * bo'lmaydi.
   */
  const [webLoggedIn, setWebLoggedIn] = useState(() => !!getAuthToken());
  const inTelegram = isTelegramEnv();

  return (
    <I18nProvider>
      {inTelegram || webLoggedIn
        ? <AppInner authMode={inTelegram ? 'telegram' : 'web'} />
        : <TelegramOnly onLoggedIn={() => setWebLoggedIn(true)} />}
    </I18nProvider>
  );
}

/*
 * VAQTINCHALIK — fullscreen nega ishlamayotganini aniqlash uchun
 * (lib/telegram.js window.__lokmagoFsDebug ni to'ldiradi).
 * Tasdiqlangach OLIB TASHLANADI. Faqat matn, hech qanday tarmoq
 * so'rovi yubormaydi, ilovaning boshqa qismiga ta'sir qilmaydi.
 */
function FullscreenDebugOverlay() {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    const t = setInterval(() => {
      if (window.__lokmagoFsDebug) { setInfo({ ...window.__lokmagoFsDebug }); }
    }, 300);
    return () => clearInterval(t);
  }, []);
  if (!info) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 99999,
      background: '#000', color: '#0f0', fontSize: 10, fontFamily: 'monospace',
      padding: '4px 8px', wordBreak: 'break-all', lineHeight: 1.4,
    }}>
      {JSON.stringify(info)}
    </div>
  );
}

function AppInner({ authMode = 'telegram' }) {
  const updateUser = useUser((s) => s.updateUser);
  const setAuthStatus = useUser((s) => s.setAuthStatus);
  const currentUser = useUser((s) => s.user);

  // Splash faqat sessiya boshида bir marta (qayta yuklaшда emas)
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('lokmago_splash_seen'));

  const finishSplash = () => {
    sessionStorage.setItem('lokmago_splash_seen', '1');
    setShowSplash(false);
  };

  useEffect(() => {
    const loadAddresses = useUser.getState().loadAddresses;

    const applyProfile = (profile) => {
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
      // Serverdagi manzillar va shaxsiy socket xonasi
      loadAddresses?.();
      const uid = profile._id || profile.id;
      if (uid) joinUserRoom(uid);
    };

    /*
     * authMode==='web': token Login Widget orqali ALLAQACHON
     * olingan (TelegramOnly ekranida) — bu yerda faqat profilni
     * o'qiymiz. authenticateWithTelegram() ISHLATILMAYDI, chunki u
     * Telegram.WebApp.initData'ga tayanadi — brauzerda bu obyekt
     * umuman mavjud emas.
     */
    const authPromise = authMode === 'web'
      ? api.getMe().then((res) => res.user)
      : authenticateWithTelegram();

    authPromise
      .then(applyProfile)
      .catch((err) => {
        console.warn('Auth muvaffaqiyatsiz, mehmon rejimida davom etiladi:', err);
        setAuthStatus('failed');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <FullscreenDebugOverlay />
      {showSplash && <Splash onDone={finishSplash} />}
      <BrowserRouter>
        <SubscriptionGate>
        <ErrorBoundary>
        <Suspense fallback={<div className="app-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>}>
          <StartParamHandler />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/restaurant/:id" element={<RestaurantPage />} />
            <Route path="/my-reservations" element={<MyReservationsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/cards" element={<CardsPage />} />
            <Route path="/food/:id" element={<FoodPage />} />
            <Route path="/restaurant/:id/reserve" element={<ReservationPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/order/track" element={<OrderTrackPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/orders" element={<OrdersPage />} />
                          <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
        </SubscriptionGate>
        <FloatingLayer />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Ulashilgan havola bilan ochilganda (startapp=food_<id>).
 *
 * Parametr getStartParam() da tekshirilgan — faqat to'g'ri
 * ObjectId o'tadi. Taom mavjudligi sahifaning o'zida backend
 * orqali tasdiqlanadi, topilmasa "Taom topilmadi" chiqadi.
 *
 * Ilova ishga tushganda BIR MARTA bajariladi va oddiy
 * navigatsiyaga xalaqit bermaydi.
 */
function StartParamHandler() {
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const param = getStartParam();
    if (!param || param.type !== 'dish') return;

    // Sahifa o'zi taomni yuklaydi va tekshiradi
    navigate(`/food/${param.id}`, { replace: true });
  }, [navigate]);

  return null;
}

function initialsOf(first, last) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'US';
}
