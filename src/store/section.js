import { create } from 'zustand';
import { applySectionTheme } from '@/lib/telegram';

/*
 * ═══ JORIY BO'LIM: Lokma Go (taomlar) yoki Lokma Market (do'konlar) ═══
 *
 * Market'ga kirilgach mijoz pastki menyu (Qidiruv, Buyurtmalar, Profil),
 * savat va boshqa sahifalarga o'tsa ham MARKET'da qoladi: ranglar yashil,
 * "Bosh" tugmasi /market'ga, qidiruv do'kon mahsulotlarini qidiradi.
 * Lokma Go'ga faqat "Lokma Go" tugmasi (bosh sahifa ochilganda) qaytaradi.
 *
 * sessionStorage — Telegram oynasi yopilib qayta ochilsa ilova odatdagidek
 * Lokma Go'dan boshlanadi; ochiq turgan seans davomida bo'lim saqlanadi
 * (sahifa yangilansa ham).
 */
const KEY = 'lokma_section';
const read = () => {
  try { return sessionStorage.getItem(KEY) === 'market' ? 'market' : 'go'; } catch { return 'go'; }
};

export const useSection = create((set, get) => ({
  section: read(),
  setSection: (section) => {
    const next = section === 'market' ? 'market' : 'go';
    if (get().section !== next) {
      try { sessionStorage.setItem(KEY, next); } catch { /* bloklangan */ }
      set({ section: next });
    }
    applySectionTheme(next);
  },
}));

/** Ilova ochilganda saqlangan bo'limni qo'llash (App bir marta chaqiradi). */
export function initSectionTheme() {
  applySectionTheme(useSection.getState().section);
}
