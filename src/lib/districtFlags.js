/*
 * Tuman tanlagich va avtomatik aniqlash — standart O'CHIQ (Vercel: VITE_DISTRICT_SELECTOR_ENABLED / VITE_DISTRICT_AUTO_DETECT_ENABLED).
 * Ikkinchi qulf — server: /districts javobidagi `boundaries` (DISTRICT_BOUNDARIES_ENABLED, ...). Ikkalasi ham yoqilmaguncha
 * header'da hech narsa ko'rinmaydi va katalog so'rovlariga `district` qo'shilmaydi — ilova avvalgidek.
 */
export const DISTRICT_SELECTOR_ENABLED = import.meta.env?.VITE_DISTRICT_SELECTOR_ENABLED === 'true';
export const DISTRICT_AUTO_DETECT_ENABLED = DISTRICT_SELECTOR_ENABLED && import.meta.env?.VITE_DISTRICT_AUTO_DETECT_ENABLED === 'true';
