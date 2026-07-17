import { create } from 'zustand';

// Bannerlar asosan real API'дан (useBannersQuery) keladi.
// Bu store faqat local qo'shimcha holatlar uchun (bo'sh boshlanadi — mock yo'q).
export const useBanners = create((set) => ({
  banners: [],
  smallBanners: [],

  setBanners: (list) => set({ banners: list }),
  addBanner: (b) => set((s) => ({ banners: [...s.banners, { ...b, id: 'b' + Date.now() }] })),
  updateBanner: (id, b) => set((s) => ({ banners: s.banners.map((x) => x.id === id ? { ...b, id } : x) })),
  removeBanner: (id) => set((s) => ({ banners: s.banners.filter((x) => x.id !== id) })),

  addSmallBanner: (b) => set((s) => ({ smallBanners: [...s.smallBanners, { ...b, id: 'sb' + Date.now() }] })),
  updateSmallBanner: (id, b) => set((s) => ({ smallBanners: s.smallBanners.map((x) => x.id === id ? { ...b, id } : x) })),
  removeSmallBanner: (id) => set((s) => ({ smallBanners: s.smallBanners.filter((x) => x.id !== id) })),
}));
