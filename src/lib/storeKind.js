/* Do'kon (Lokma Market) aniqlash — server services/storeRules.js bilan bir xil (eski serverda isStore bo'lmasa ham). */
export const STORE_CATEGORIES = ['magazin_oziq', 'magazin_meva', 'magazin'];

export function isStoreRestaurant(r) {
  return Boolean(r && (r.isStore || r.kind === 'shop' || STORE_CATEGORIES.includes(r.category)));
}
