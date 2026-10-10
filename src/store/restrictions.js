import { create } from 'zustand';

/*
 * Bloklangan mijoz holati (server: code USER_BLOCKED + sabab).
 * api/index.js apiFetch har qanday javobda USER_BLOCKED ni ko'rsa shu yerga yozadi,
 * App esa butun ekranli "Hisob bloklangan" oynasini ko'rsatadi.
 */
export const useRestrictions = create((set) => ({
  blocked: null, // { reason, at }
  setBlocked: (blocked) => set({ blocked }),
}));
