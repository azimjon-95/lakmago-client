import { DISTRICT_SELECTOR_ENABLED } from './districtFlags';
import { useDistrict, useDistrictMeta } from '@/store/district';

/*
 * Katalog so'rovlariga `district` qo'shish — BITTA joyda (api/index.js → apiFetch), har chaqiruvchi alohida o'zgartirilmaydi.
 * Shartlar (hammasi bajarilsa): VITE_DISTRICT_SELECTOR_ENABLED, server katalog filtrini yoqgan (/districts boundaries),
 * faol tuman tanlangan va server uni qo'llab-quvvatlaydi. Aks holda URL AYNAN avvalgidek.
 * Faqat GET va faqat katalog ro'yxatlari (restoran sahifasi, menyu, buyurtma va boshqalarga tegmaydi).
 */
// banners va ads/banner — bosh sahifa slayderi faqat tanlangan tumanniki (eski server parametrni e'tiborsiz qoldiradi)
const CATALOG_PATHS = /^\/(restaurants|market\/stores|market\/products|dishes\/(trending|discounted|all)|promotions|banners|ads\/banner)(\?|$)/;

export function activeCatalogDistrict() {
  if (!DISTRICT_SELECTOR_ENABLED) return null;
  const meta = useDistrictMeta.getState().meta;
  if (!meta?.catalogFilterEnabled) return null;
  const id = useDistrict.getState().activeDistrictId;
  return id && meta.supported?.includes(id) ? id : null;
}

export function withCatalogDistrict(path, method) {
  if (method && String(method).toUpperCase() !== 'GET') return path;
  if (typeof path !== 'string' || !CATALOG_PATHS.test(path) || /[?&]district=/.test(path)) return path;
  const d = activeCatalogDistrict();
  if (!d) return path;
  return `${path}${path.includes('?') ? '&' : '?'}district=${encodeURIComponent(d)}`;
}

/** Tuman almashganda tozalanadigan (qayta yuklanadigan) katalog so'rovlari — kursor ham noldan boshlanadi. */
export const CATALOG_QUERY_PREFIXES = [['restaurants'], ['dishes', 'trending'], ['dishes', 'discounted'], ['dishes', 'all'], ['dishes', 'feed'], ['market', 'stores'], ['market', 'products'], ['promotions'], ['banners'], ['ads', 'banner']];
