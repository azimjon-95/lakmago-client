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
const FavoritesPage = lazy(() => import('@/pages/Favorites/FavoritesPage').then((m) => ({ default: m.FavoritesPage })));
const MyReservationsPage = lazy(() => import('@/pages/Reservation/MyReservationsPage').then((m) => ({ default: m.MyReservationsPage })));
const ReservationPage = lazy(() => import('@/pages/Reservation/ReservationPage').then((m) => ({ default: m.ReservationPage })));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SearchPage = lazy(() => import('@/pages/Search/SearchPage').then((m) => ({ default: m.SearchPage })));
const DiscoverDishesPage = lazy(() => import('@/pages/Discover/DiscoverDishesPage').then((m) => ({ default: m.DiscoverDishesPage })));
import { useUser } from '@/store/user';
import { authenticateWithTelegram, getStartParam, isTelegramEnv } from '@/lib/telegram';
import { api, getAuthToken, hasRefreshToken, restoreSession } from '@/api';
import { joinUserRoom } from '@/lib/socket';
import { syncGuestAddresses } from '@/lib/syncGuestAddresses';
import { I18nProvider } from '@/i18n';
import { ActiveOrderBadge } from '@/components/ActiveOrderBadge/ActiveOrderBadge';
import { SupportChat } from '@/components/SupportChat/SupportChat';
import { Splash } from '@/components/Splash/Splash';
import { useTelegramBack } from '@/hooks/useTelegramBack';

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
   * PHASE 3 (Guest-First Auth): ilova endi HAR DOIM <AppInner />
   * ko'rsatadi — Telegram ichida ham, Safari'da ham, guest bo'lsa
   * ham. TelegramOnly (Login Widget) endi App darajasida BLOKLOVCHI
   * ekran sifatida ishlatilmaydi — u faqat AuthGateModal ichida
   * (order/booking submit vaqtida, useRequireAuth() orqali) chiqadi.
   * TelegramOnly.jsx fayli o'zi o'zgartirilmadi, faqat bu yerdan
   * chaqirilishi olib tashlandi.
   *
   * AVVAL (2-bosqich): brauzerda login qilinmagan bo'lsa <TelegramOnly />
   * to'liq ekranni bloklardi — Main Page'ni umuman ko'rsatmasdi.
   */
  const inTelegram = isTelegramEnv();

  /*
   * ═══ SESSIYANI TIKLASH (o'zgarishsiz — mavjud mexanizm) ═══
   *
   * accessToken sessionStorage'da saqlanadi — brauzer/tab
   * yopilganda o'chadi. Agar refreshToken localStorage'da bo'lsa
   * (oldin login qilingan bo'lsa), jimgina tiklaymiz. Bu YANGI
   * (hech qachon login qilmagan) guest uchun UMUMAN ishga
   * tushmaydi (hasRefreshToken()===false), shuning uchun ular
   * uchun Main Page HECH QANDAY kechikishsiz ochiladi.
   */
  const [restoring, setRestoring] = useState(
    () => !inTelegram && !getAuthToken() && hasRefreshToken(),
  );

  useEffect(() => {
    if (!restoring) return;
    let cancelled = false;
    restoreSession()
      .catch(() => { /* tiklab bo'lmadi — AppInner guest sifatida ochiladi */ })
      .finally(() => { if (!cancelled) setRestoring(false); });
    return () => { cancelled = true; };
  }, [restoring]);

  return (
    <I18nProvider>
      {restoring ? null : <AppInner authMode={inTelegram ? 'telegram' : 'web'} />}
    </I18nProvider>
  );
}

function AppInner({ authMode = 'telegram' }) {
  const updateUser = useUser((s) => s.updateUser);
  const setAuthStatus = useUser((s) => s.setAuthStatus);

  // Splash faqat sessiya boshида bir marta (qayta yuklaшда emas)
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('lokmago_splash_seen'));

  const finishSplash = () => {
    sessionStorage.setItem('lokmago_splash_seen', '1');
    setShowSplash(false);
  };

  useEffect(() => {
    const loadAddresses = useUser.getState().loadAddresses;

    const applyProfile = async (profile) => {
      /*
       * MUHIM TUZATISH (residual risk audit): bu useEffect([])
       * FAQAT bir marta (mount'da) ishga tushadi — shuning uchun
       * yopilgan funksiya (closure) ichida "currentUser"ni
       * TO'G'RIDAN-TO'G'RI ishlatish REACT STALE CLOSURE xatosiga
       * olib kelardi: applyProfile har doim MOUNT PAYTIDAGI
       * currentUser qiymatini ko'rardi, undan keyin (masalan auth
       * hali tugamagan paytda guest manzil qo'shsa) sodir bo'lgan
       * o'zgarishlarni HECH QACHON ko'rmasdi. Natijada guest
       * qo'shgan manzil updateUser() ning O'ZIDA (loadAddresses()
       * gacha yetmasdan ham) yo'qolib qolardi.
       *
       * TUZATISH: useUser.getState().user — bu Zustand'ning
       * to'g'ridan-to'g'ri, ENG SO'NGGI holatni o'qish usuli,
       * React render siklidan MUSTAQIL — closure muammosiga
       * duchor emas.
       */
      const latest = useUser.getState().user;
      updateUser({
        telegramId: profile.telegramId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        username: profile.username,
        languageCode: profile.languageCode,
        isPremium: profile.isPremium,
        photoUrl: profile.photoUrl,
        photoInitials: initialsOf(profile.firstName, profile.lastName),
        phone: latest.phone ?? profile.phone ?? null,
        addresses: latest.addresses.length ? latest.addresses : profile.addresses ?? [],
        verified: true,
      });
      setAuthStatus('done');

      /*
       * ASOSIY TUZATISH (AuthGateModal.jsx bilan BIR XIL, umumiy
       * lib/syncGuestAddresses.js orqali): loadAddresses() DARHOL
       * chaqirilmaydi — avval guest tempId manzillari (agar bo'lsa)
       * SERVERGA ketma-ket saqlanadi, shundan KEYINGINA
       * loadAddresses() chaqiriladi. Bu yerda (App.jsx, fon
       * jarayoni, UI yo'q) xato bo'lsa — faqat log qilinadi,
       * loadAddresses() CHAQIRILMAYDI (manzil local'da tempId
       * bilan qoladi — order baribir muvaffaqiyatli bo'ladi,
       * chunki checkout manzil MA'LUMOTINI to'g'ridan-to'g'ri
       * yuboradi, server Address yozuviga bog'liq emas — faqat
       * "boshqa qurilmada ham ko'rinish" keyinga qoladi).
       */
      const syncResult = await syncGuestAddresses();
      if (!syncResult.ok) {
        console.warn('Guest manzilini serverga saqlab bo\'lmadi (keyinroq qayta urinilishi mumkin):', syncResult.error);
      } else {
        // Serverdagi manzillar va shaxsiy socket xonasi
        await loadAddresses?.();
      }

      const uid = profile._id || profile.id;
      if (uid) joinUserRoom(uid);
    };

    /*
     * authMode==='web': token Login Widget orqali ALLAQACHON
     * olingan (TelegramOnly ekranida) — bu yerda faqat profilni
     * o'qiymiz. authenticateWithTelegram() ISHLATILMAYDI, chunki u
     * Telegram.WebApp.initData'ga tayanadi — brauzerda bu obyekt
     * umuman mavjud emas.
     *
     * MUHIM (Phase 3): guest (hali hech qachon login qilmagan
     * brauzer foydalanuvchisi) uchun ham api.getMe() chaqiriladi —
     * token yo'q bo'lgani uchun bu 401 bilan tugaydi va catch()
     * setAuthStatus('failed') qiladi. Bu XATO EMAS: 'failed'
     * shunchaki "hali autentifikatsiya qilinmagan" degani —
     * ilova guest sifatida ishlayveradi, checkout/booking
     * vaqtida useRequireAuth() kerak bo'lganda AuthGateModal'ni
     * ochadi.
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
      {showSplash && <Splash onDone={finishSplash} />}
      <BrowserRouter>
        <ErrorBoundary>
        <Suspense fallback={<div className="app-shell" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span className="spinner" /></div>}>
          <StartParamHandler />
          <TelegramBackHandler />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/restaurant/:id" element={<RestaurantPage />} />
            <Route path="/my-reservations" element={<MyReservationsPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
            <Route path="/food/:id" element={<FoodPage />} />
            <Route path="/restaurant/:id/reserve" element={<ReservationPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/order/track" element={<OrderTrackPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/discover/:type" element={<DiscoverDishesPage />} />
            <Route path="/orders" element={<OrdersPage />} />
                          <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
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

// Android/Telegram "orqaga" tugmasi — useNavigate/useLocation
// kerak bo'lgani uchun BrowserRouter ICHIDA chaqiriladi (App()
// darajasida emas). Tafsilot: hooks/useTelegramBack.js
function TelegramBackHandler() {
  useTelegramBack();
  return null;
}

function initialsOf(first, last) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'US';
}
