import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/*
 * ═══ KATALOG TUMANI (header tanlagichi) — saqlangan yetkazish manzilidan ALOHIDA ═══
 * GPS koordinatalari bu yerda SAQLANMAYDI (ular store/deviceLocation.js da, faqat xotirada).
 * Saqlanadi (persist): faol tuman, rejim (auto/manual), oxirgi avtomatik aniqlangan tuman, chegara versiyasi.
 *
 *   activeDistrictId          — katalog shu tuman bo'yicha (null — tanlanmagan: katalog filtrsiz, eski xatti-harakat)
 *   selectionMode             — 'auto' | 'manual' (qo'lda tanlangan bo'lsa GPS uni bosib ketmaydi)
 *   lastAutoDetectedDistrictId, lastResolvedAt, boundaryVersion
 *   isResolving, autoStatus   — vaqtinchalik (persist qilinmaydi): 'idle' | 'checking' | 'denied' | 'no_permission' | 'low_accuracy' | 'outside' | 'uncertain' | 'error'
 */
const memoryFallback = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};
const safeStorage = () => {
  try { const k = '__lokma_d'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch { return memoryFallback(); }
};

export const useDistrict = create(persist(
  (set, get) => ({
    activeDistrictId: null,
    selectionMode: 'auto',
    lastAutoDetectedDistrictId: null,
    lastResolvedAt: null,
    boundaryVersion: null,
    isResolving: false,
    autoStatus: 'idle',

    /** Qo'lda tanlash: GPS "Avtomatik"ka qaytmaguncha bosib ketmaydi. */
    selectManual: (id) => set({ activeDistrictId: id, selectionMode: 'manual' }),
    /** "Avtomatik joylashuvga qaytish": oxirgi avtomatik natija (bo'lsa) darhol qo'yiladi, keyin GPS qayta tekshiriladi. */
    backToAuto: () => set((s) => ({ selectionMode: 'auto', activeDistrictId: s.lastAutoDetectedDistrictId ?? s.activeDistrictId })),
    /** Avtomatik natija (tasdiqlangan). Manual rejimda faqat lastAuto yangilanadi, faol tuman o'zgarmaydi. */
    applyAuto: (id, version) => set((s) => ({
      lastAutoDetectedDistrictId: id,
      lastResolvedAt: new Date().toISOString(),
      boundaryVersion: version ?? s.boundaryVersion,
      ...(s.selectionMode === 'auto' && id !== s.activeDistrictId ? { activeDistrictId: id } : {}),
    })),
    setStatus: (autoStatus, isResolving = false) => set({ autoStatus, isResolving }),
    /** Server tumanni qo'llab-quvvatlamasa (versiya/ro'yxat o'zgargan) — tanlov bekor qilinadi (noto'g'ri tuman ko'rsatilmasin). */
    dropUnsupported: (supported) => {
      const s = get();
      if (s.activeDistrictId && !supported.includes(s.activeDistrictId)) set({ activeDistrictId: null, selectionMode: 'auto' });
      if (s.lastAutoDetectedDistrictId && !supported.includes(s.lastAutoDetectedDistrictId)) set({ lastAutoDetectedDistrictId: null });
    },
  }),
  {
    name: 'lokma-district',
    version: 1,
    storage: createJSONStorage(safeStorage),
    partialize: (s) => ({
      activeDistrictId: s.activeDistrictId, selectionMode: s.selectionMode,
      lastAutoDetectedDistrictId: s.lastAutoDetectedDistrictId, lastResolvedAt: s.lastResolvedAt, boundaryVersion: s.boundaryVersion,
    }),
  },
));

/*
 * Server metama'lumoti (/districts → boundaries): qaysi tumanlar qo'llab-quvvatlanadi, katalog filtri / avto-aniqlash yoqilganmi.
 * Persist QILINMAYDI — har ishga tushishda serverdan (server o'chirsa — mijoz darhol to'xtaydi).
 */
export const useDistrictMeta = create((set) => ({
  meta: null,      // { version, supported[], noBoundary[], autoDetect{enabled,minAccuracyMeters,confirmationReadings}, catalogFilterEnabled }
  districts: [],   // /districts.districts (nomlar)
  setMeta: (meta, districts) => set({ meta, districts }),
}));
