import { create } from 'zustand';
import { banners as defaultBanners, smallBanners as defaultSmallBanners } from '@/data/mock';













export const useBanners = create((set) => ({
  banners: defaultBanners,
  smallBanners: defaultSmallBanners,

  addBanner: (b) => set((s) => ({ banners: [...s.banners, { ...b, id: 'b' + Date.now() }] })),
  updateBanner: (id, b) => set((s) => ({ banners: s.banners.map((x) => x.id === id ? { ...b, id } : x) })),
  removeBanner: (id) => set((s) => ({ banners: s.banners.filter((x) => x.id !== id) })),

  addSmallBanner: (b) => set((s) => ({ smallBanners: [...s.smallBanners, { ...b, id: 'sb' + Date.now() }] })),
  updateSmallBanner: (id, b) => set((s) => ({ smallBanners: s.smallBanners.map((x) => x.id === id ? { ...b, id } : x) })),
  removeSmallBanner: (id) => set((s) => ({ smallBanners: s.smallBanners.filter((x) => x.id !== id) }))
}));
