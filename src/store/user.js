import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';


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














export const useUser = create(
  persist(
    (set) => ({
  user: getInitialUser(),
  authStatus: 'pending',
  lastPaymentMethod: 'payme',

  setUser: (user) => set({ user }),

  updateUser: (patch) => set((state) => ({ user: { ...state.user, ...patch } })),

  // Manzil qo'shish — avval lokal (tez ko'rinadi), keyin serverga saqlanadi
  addAddress: async (address) => {
    const tempId = 'addr' + Date.now();
    const newAddr = { ...address, id: tempId };
    set((state) => ({
      user: {
        ...state.user,
        addresses: [...state.user.addresses, newAddr],
        defaultAddressId: tempId,
      },
    }));

    // Serverga saqlaymiz — boshqa qurilmada ham ko'rinadi
    try {
      const { api } = await import('@/api');
      const res = await api.createAddress({
        title: address.title,
        address: address.address,
        street: address.street || '',
        city: address.city || '',
        entrance: address.entrance || '',
        floor: address.floor || '',
        flat: address.flat || '',
        note: address.note || '',
        labelId: address.labelId || 'other',
        ...(address.lat ? { lat: address.lat, lng: address.lng } : {}),
      });
      // Server javobini o'rnatamiz (haqiqiy _id bilan)
      if (res?.addresses) {
        set((state) => ({
          user: {
            ...state.user,
            addresses: res.addresses.map((a) => ({ ...a, id: String(a._id) })),
            defaultAddressId: res.defaultAddressId ? String(res.defaultAddressId) : tempId,
          },
        }));
      }
    } catch {
      // Server yo'q — lokal saqlanган holat qoladi (offline ishlaydi)
    }
  },

  // Serverdan manzillarni yuklash (ilova ochilganda)
  loadAddresses: async () => {
    try {
      const { api } = await import('@/api');
      const res = await api.getAddresses();
      if (res?.addresses) {
        set((state) => ({
          user: {
            ...state.user,
            addresses: res.addresses.map((a) => ({ ...a, id: String(a._id) })),
            defaultAddressId: res.defaultAddressId ? String(res.defaultAddressId) : state.user.defaultAddressId,
          },
        }));
      }
    } catch { /* offline — lokal holat qoladi */ }
  },

  removeAddress: async (id) => {
    try {
      const { api } = await import('@/api');
      await api.deleteAddress(id);
    } catch { /* offline */ }
    set((state) => {
      const addresses = state.user.addresses.filter((a) => a.id !== id);
      const defaultAddressId =
        state.user.defaultAddressId === id ? addresses[0]?.id ?? null : state.user.defaultAddressId;
      return { user: { ...state.user, addresses, defaultAddressId } };
    });
  },

  setDefaultAddress: async (id) => {
    set((state) => ({ user: { ...state.user, defaultAddressId: id } }));
    try {
      const { api } = await import('@/api');
      await api.setDefaultAddress(id);
    } catch { /* offline */ }
  },

  setAuthStatus: (authStatus) => set({ authStatus }),
  setLastPaymentMethod: (lastPaymentMethod) => set({ lastPaymentMethod })
    }),
    {
      name: 'lokmago_user',
      storage: createJSONStorage(() => localStorage),
      // Faqat kerakli maydonlarni saqlaymiz.
      // Manzillar va telefon — bir marta kiritilsa hamma joyda ko'rinadi.
      partialize: (state) => ({
        user: {
          addresses: state.user.addresses,
          defaultAddressId: state.user.defaultAddressId,
          phone: state.user.phone,
        },
        lastPaymentMethod: state.lastPaymentMethod,
      }),
      // Saqlangan ma'lumotni Telegram profili bilan birlashtiramiz:
      // ism/rasm har safar Telegram'dan yangilanadi, manzil saqlanganidan olinadi.
      merge: (persisted, current) => ({
        ...current,
        ...persisted,
        user: {
          ...current.user,
          ...(persisted?.user || {}),
        },
      }),
    },
  ),
);
