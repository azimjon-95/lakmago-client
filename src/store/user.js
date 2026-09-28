import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api, clearAuthTokens } from '@/api';


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
    favorites: { restaurants: [], dishes: [] },
    verified: false
  };
}














export const useUser = create(
  persist(
    (set, get) => ({
  user: getInitialUser(),
  authStatus: 'pending',
  /*
   * Oxirgi tanlangan to'lov usuli.
   *
   * Standart 'cash' — ILGARI 'payme' edi va bu XATOGA olib
   * kelardi: qiymat localStorage'da saqlanadi, shuning uchun
   * Payme umuman ulanmagan bo'lsa ham savat sahifasi uni
   * boshlang'ich tanlov qilib olardi va buyurtma "payme hali
   * ulanmagan" xatosi bilan qaytardi.
   *
   * 'cash' har doim mavjud, shuning uchun xavfsiz standart.
   * Haqiqiy tanlov baribir /payments/status ro'yxatiga qarab
   * moslashtiriladi (CartPage'dagi useEffect).
   */
  lastPaymentMethod: 'cash',

  setUser: (user) => set({ user }),

  updateUser: (patch) => set((state) => ({ user: { ...state.user, ...patch } })),

  // Manzil qo'shish — avval lokal (tez ko'rinadi), keyin serverga saqlanadi
  // ===== SEVIMLILAR =====
  // { restaurants: [id], dishes: [id] } — localStorage'da saqlanadi
  toggleFavorite: (kind, id) =>
    set((state) => {
      const key = kind === 'dish' ? 'dishes' : 'restaurants';
      const cur = state.user.favorites?.[key] || [];
      const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id];
      return {
        user: {
          ...state.user,
          favorites: { ...(state.user.favorites || {}), [key]: next },
        },
      };
    }),

  isFavorite: (kind, id) => {
    const f = get().user.favorites || {};
    const key = kind === 'dish' ? 'dishes' : 'restaurants';
    return (f[key] || []).includes(id);
  },

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
      await api.deleteAddress(id);
    } catch { /* offline */ }
    set((state) => {
      const addresses = state.user.addresses.filter((a) => a.id !== id);
      const defaultAddressId =
        state.user.defaultAddressId === id ? addresses[0]?.id ?? null : state.user.defaultAddressId;
      return { user: { ...state.user, addresses, defaultAddressId } };
    });
  },

    /*
   * Mavjud manzilni TAHRIRLASH (buyurtma tasdiqlash qadamidan).
   *
   * Avval lokal yangilanadi (mijoz o'zgarishni DARHOL ko'radi), keyin
   * serverga PATCH. Server javobi kelsa — u haqiqat manbai: ro'yxat
   * server bilan almashtiriladi. Server yo'q/xato bo'lsa — lokal holat
   * qoladi (addAddress bilan bir xil offline qoidasi), lekin xato
   * YUTILMAYDI: natija `{ ok, synced }` sifatida qaytadi, chaqiruvchi
   * "saqlanmadi" deb ogohlantira oladi.
   *
   * `id` o'zgarmaydi va defaultAddressId ga tegilmaydi.
   * Faqat ruxsat etilgan maydonlar yuboriladi (server zod sxemasi bilan
   * bir xil) — tasodifan `id`/`_id` serverga ketib qolmasin.
   */
  updateAddress: async (id, patch) => {
    const ALLOWED = ['title', 'address', 'street', 'city', 'note', 'labelId', 'lat', 'lng'];
    const clean = {};
    for (const k of ALLOWED) if (patch[k] !== undefined) clean[k] = patch[k];

    let exists = false;
    set((state) => {
      exists = state.user.addresses.some((a) => a.id === id);
      if (!exists) return state;
      return {
        user: {
          ...state.user,
          addresses: state.user.addresses.map((a) => (a.id === id ? { ...a, ...clean } : a)),
        },
      };
    });
    if (!exists) return { ok: false, synced: false };

    try {
      const res = await api.updateAddress(id, clean);
      if (res?.addresses) {
        set((state) => ({
          user: {
            ...state.user,
            addresses: res.addresses.map((a) => ({ ...a, id: String(a._id) })),
            // Tanlangan manzil o'zgarmasin: id server javobida ham bir xil
            defaultAddressId: state.user.defaultAddressId,
          },
        }));
      }
      return { ok: true, synced: true };
    } catch {
      // Lokal saqlangan (yoki vaqtinchalik id — serverda hali yo'q)
      return { ok: true, synced: false };
    }
  },

  setDefaultAddress: async (id) => {
    set((state) => ({ user: { ...state.user, defaultAddressId: id } }));
    try {
      await api.setDefaultAddress(id);
    } catch { /* offline */ }
  },

  setAuthStatus: (authStatus) => set({ authStatus }),

  /*
   * logout() — Auth fundamenti (2-bosqich): serverdagi Session'ni
   * bekor qiladi (Session.revokedAt), mahalliy tokenlarni va
   * foydalanuvchi holatini tozalaydi. Client UI'da hozircha
   * "Chiqish" tugmasi yo'q (Telegram Mini App'da odatiy holat —
   * Telegram o'zi identifikatsiyani boshqaradi), lekin brauzer
   * (Login Widget) orqali kirgan foydalanuvchi uchun kelajakda
   * kerak bo'ladi — shu funksiya tayyor.
   */
  logout: async () => {
    try {
      await api.logoutSession().catch(() => {}); // server bilan bog'lanmasa ham lokal tozalash davom etadi
      clearAuthTokens();
    } finally {
      set({ user: getInitialUser(), authStatus: 'pending' });
    }
  },
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
          favorites: state.user.favorites,
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

/*
 * Auth fundamenti (2-bosqich) spetsifikatsiyasidagi nomlar bilan
 * — authStatus'dan hisoblangan, reaktiv selektor hook'lar.
 * Mavjud authStatus/setAuthStatus pattern ATAYLAB o'zgartirilmadi
 * (App.jsx va boshqa joylarda ishlatiladi) — bu FAQAT qulay
 * nomlangan qo'shimcha ustiga qurilgan qatlam.
 */
export const useIsAuthenticated = () => useUser((s) => s.authStatus === 'done');
export const useIsAuthLoading = () => useUser((s) => s.authStatus === 'pending');
