import { create } from 'zustand';
import { banners as defaultBanners, smallBanners as defaultSmallBanners } from '@/data/mock';
import type { Banner, SmallBanner } from '@/types';

interface BannersState {
  banners: Banner[];
  smallBanners: SmallBanner[];
  addBanner: (b: Omit<Banner, 'id'>) => void;
  updateBanner: (id: string, b: Omit<Banner, 'id'>) => void;
  removeBanner: (id: string) => void;
  addSmallBanner: (b: Omit<SmallBanner, 'id'>) => void;
  updateSmallBanner: (id: string, b: Omit<SmallBanner, 'id'>) => void;
  removeSmallBanner: (id: string) => void;
}

export const useBanners = create<BannersState>((set) => ({
  banners: defaultBanners,
  smallBanners: defaultSmallBanners,

  addBanner: (b) => set((s) => ({ banners: [...s.banners, { ...b, id: 'b' + Date.now() }] })),
  updateBanner: (id, b) => set((s) => ({ banners: s.banners.map((x) => (x.id === id ? { ...b, id } : x)) })),
  removeBanner: (id) => set((s) => ({ banners: s.banners.filter((x) => x.id !== id) })),

  addSmallBanner: (b) => set((s) => ({ smallBanners: [...s.smallBanners, { ...b, id: 'sb' + Date.now() }] })),
  updateSmallBanner: (id, b) => set((s) => ({ smallBanners: s.smallBanners.map((x) => (x.id === id ? { ...b, id } : x)) })),
  removeSmallBanner: (id) => set((s) => ({ smallBanners: s.smallBanners.filter((x) => x.id !== id) })),
}));
