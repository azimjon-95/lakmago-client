import { create } from 'zustand';

/*
 * Telefonning OXIRGI aniq joylashuvi (faqat XOTIRADA, `persist` YO'Q): GPS tekshiruvi (useAddressGpsCheck), "Hozirgi joyim"
 * (useCurrentLocation) va ilova ochilganda jim olingan nuqta (lib/sessionLocation.js) shu yerga yozadi.
 * Buyurtma yuborilganda server shu nuqta bilan yetkazish manzili orasidagi masofani saqlaydi (restoran ogohlantiriladi).
 * { lat, lng, accuracy (m), at (ms) }
 */
export const useDeviceLocation = create((set) => ({
  fix: null,
  set: (fix) => {
    if (fix && Number.isFinite(fix.lat) && Number.isFinite(fix.lng) && !(fix.lat === 0 && fix.lng === 0)) {
      set({ fix: { lat: fix.lat, lng: fix.lng, accuracy: Number.isFinite(fix.accuracy) ? fix.accuracy : null, at: fix.at ?? Date.now() } });
    }
  },
  clear: () => set({ fix: null }),
}));
