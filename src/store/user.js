import { create } from 'zustand';


function initialsOf(first, last) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  return (f + l).toUpperCase() || 'US';
}

// Sahifa ochilishidagi boshlang'ich holat (sinxron). Agar Telegram WebApp mavjud bo'lsa,
// initDataUnsafe.user'dan ism/familiya/rasm darhol olinadi — bu hali server tomonidan
// tasdiqlanmagan (mahalliy ko'rsatish uchun). Telefon/manzil Telegramda yo'q, bo'sh boshlanadi.
function getInitialUser() {
  const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;
  const tgUser = tg?.initDataUnsafe?.user;

  if (tgUser) {
    return {
      telegramId: String(tgUser.id),
      firstName: tgUser.first_name || '',
      lastName: tgUser.last_name || '',
      username: tgUser.username || '',
      languageCode: tgUser.language_code || 'uz',
      isPremium: Boolean(tgUser.is_premium),
      photoUrl: tgUser.photo_url || null,
      photoInitials: initialsOf(tgUser.first_name, tgUser.last_name),
      phone: null,
      addresses: [],
      defaultAddressId: null,
      verified: false
    };
  }

  return {
    telegramId: null,
    firstName: 'Mehmon',
    lastName: '',
    username: '',
    languageCode: 'uz',
    isPremium: false,
    photoUrl: null,
    photoInitials: 'ME',
    phone: null,
    addresses: [],
    defaultAddressId: null,
    verified: false
  };
}














export const useUser = create((set) => ({
  user: getInitialUser(),
  authStatus: 'pending',
  lastPaymentMethod: 'payme',

  setUser: (user) => set({ user }),

  updateUser: (patch) => set((state) => ({ user: { ...state.user, ...patch } })),

  addAddress: (address) =>
  set((state) => {
    const newAddr = { ...address, id: 'addr' + Date.now() };
    const addresses = [...state.user.addresses, newAddr];
    return {
      user: {
        ...state.user,
        addresses,
        // Yangi qo'shilган manzil darhol tanlanadi (qulaylik)
        defaultAddressId: newAddr.id,
      }
    };
  }),

  removeAddress: (id) =>
  set((state) => {
    const addresses = state.user.addresses.filter((a) => a.id !== id);
    const defaultAddressId =
    state.user.defaultAddressId === id ? addresses[0]?.id ?? null : state.user.defaultAddressId;
    return { user: { ...state.user, addresses, defaultAddressId } };
  }),

  setDefaultAddress: (id) =>
  set((state) => ({ user: { ...state.user, defaultAddressId: id } })),

  setAuthStatus: (authStatus) => set({ authStatus }),
  setLastPaymentMethod: (lastPaymentMethod) => set({ lastPaymentMethod })
}));
