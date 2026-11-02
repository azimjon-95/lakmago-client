import { create } from 'zustand';

/*
 * Bir martalik "Hozirgi joyim" manzili (lib/oneTimeAddress.js qoidalari).
 * ATAYLAB `persist` YO'Q: ilova qayta ochilganda yoki buyurtmadan keyin u o'z-o'zidan yo'qoladi va
 * hech qachon saqlangan manzillarga (store/user.js) aralashmaydi.
 */
export const useOneTimeAddress = create((set) => ({
  address: null,
  set: (address) => set({ address }),
  clear: () => set({ address: null }),
}));
