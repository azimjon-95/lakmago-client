import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HomePage } from '@/pages/HomePage';
import { RestaurantPage } from '@/pages/RestaurantPage';
import { CartPage } from '@/pages/CartPage';
import { OrderTrackPage } from '@/pages/OrderTrackPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { ReservationPage } from '@/pages/ReservationPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { AdminPage } from '@/pages/AdminPage';
import { SearchPage, FavoritesPage } from '@/pages/StubPages';
import { useUser } from '@/store/user';
import { authenticateWithTelegram } from '@/lib/telegram';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

export default function App() {
  const updateUser = useUser((s) => s.updateUser);
  const setAuthStatus = useUser((s) => s.setAuthStatus);
  const currentUser = useUser((s) => s.user);

  // TZ: WebApp ochilishi bilan fon rejimida auth ishga tushadi. Bosh sahifa bu
  // jarayonni kutmaydi — komponent darhol render bo'ladi (pastdagi <Routes> bilan).
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
          // Foydalanuvchi allaqachon kiritgan narsalarni auth bilan bosib qo'ymaymiz
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
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function initialsOf(first?: string, last?: string): string {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'US';
}
