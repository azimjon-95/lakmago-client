import { dehydrate, hydrate } from '@tanstack/react-query';

/*
 * ═══════════════════════════════════════════════════════════
 * KATALOG KESHINI QURILMADA SAQLASH (restoran / do'kon sahifasi)
 * ═══════════════════════════════════════════════════════════
 *
 * Muammo: ilova har ochilganda xotiradagi kesh bo'sh — restoran yoki
 * market sahifasiga birinchi kirishda hamma narsa tarmoqdan, ketma-ket
 * keladi. Sekin internetda bu bir necha soniya bo'sh ekran.
 *
 * Yechim: faqat OMMAVIY katalog so'rovlari (restoran ma'lumoti, menyu,
 * do'kon bo'limlari, market kategoriyalari) localStorage'ga yoziladi va
 * keyingi ochilishda darhol ko'rsatiladi. Ma'lumot "eskirgan" hisoblanadi
 * (asl vaqti saqlanadi), shuning uchun sahifa ochilishi bilan fonda
 * serverdan yangilanadi — mijoz kutmaydi, lekin eski narx qolib ketmaydi.
 * Narx baribir serverda qayta hisoblanadi (server CLAUDE.md 5-qoida).
 *
 * SAQLANMAYDI: foydalanuvchiga tegishli hech narsa (buyurtma, savat,
 * profil, manzil, to'lov) — faqat quyidagi kalitlar.
 */
const STORAGE_KEY = 'lokma_qc_catalog_v1';
const MAX_AGE_MS = 24 * 60 * 60_000;        // 1 sutkadan eski — tashlanadi
const MAX_BYTES = 1_500_000;                 // localStorage (~5 MB) ning kichik qismi
const WRITE_DELAY_MS = 1500;

/** Saqlanadigan so'rovlar — faqat ommaviy katalog. */
const PERSIST_ROOTS = new Set(['restaurant', 'dishes', 'store-menu', 'market']);

export function isPersistedKey(queryKey) {
  if (!Array.isArray(queryKey) || !PERSIST_ROOTS.has(queryKey[0])) return false;
  // ['dishes', 'trending' | 'feed' | 'all' ...] — bosh sahifa tasmalari (tez o'zgaradi, katta) saqlanmaydi
  if (queryKey[0] === 'dishes' && !/^[a-f\d]{24}$/i.test(String(queryKey[1] || ''))) return false;
  if (queryKey[0] === 'market' && queryKey[1] !== 'categories') return false;
  return true;
}

// Har deploy'da yangi build — ma'lumot shakli o'zgargan bo'lsa eski kesh ishlatilmaydi
const BUSTER = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev';

function storage() {
  try { return window.localStorage; } catch { return null; }
}

export function restorePersistedQueries(queryClient, now = Date.now()) {
  const ls = storage();
  if (!ls) return 0;
  try {
    const raw = ls.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const saved = JSON.parse(raw);
    if (!saved || saved.buster !== BUSTER || !saved.state) { ls.removeItem(STORAGE_KEY); return 0; }
    const queries = (saved.state.queries || []).filter((q) =>
      isPersistedKey(q.queryKey) && q.state?.status === 'success' && now - (q.state.dataUpdatedAt || 0) < MAX_AGE_MS);
    hydrate(queryClient, { mutations: [], queries });
    return queries.length;
  } catch {
    try { ls.removeItem(STORAGE_KEY); } catch { /* */ }
    return 0;
  }
}

/** Saqlanadigan holat — yangidan eskiga, hajm chegarasigacha. */
export function snapshot(queryClient, now = Date.now()) {
  const state = dehydrate(queryClient, {
    shouldDehydrateQuery: (q) => q.state.status === 'success' && isPersistedKey(q.queryKey)
      && now - (q.state.dataUpdatedAt || 0) < MAX_AGE_MS,
  });
  const queries = [...state.queries].sort((a, b) => (b.state.dataUpdatedAt || 0) - (a.state.dataUpdatedAt || 0));
  const kept = [];
  let bytes = 0;
  for (const q of queries) {
    const size = JSON.stringify(q).length;
    if (bytes + size > MAX_BYTES) continue; // katta do'kon sahifalari ko'p bo'lsa — eng yangilari qoladi
    kept.push(q);
    bytes += size;
  }
  return { buster: BUSTER, savedAt: now, state: { mutations: [], queries: kept } };
}

export function persistQueries(queryClient) {
  const ls = storage();
  if (!ls) return () => {};
  let timer = 0;
  const write = () => {
    timer = 0;
    try {
      ls.setItem(STORAGE_KEY, JSON.stringify(snapshot(queryClient)));
    } catch {
      // Joy tugadi yoki bloklangan — saqlash shart emas, ilova ishlayveradi
      try { ls.removeItem(STORAGE_KEY); } catch { /* */ }
    }
  };
  const unsub = queryClient.getQueryCache().subscribe((e) => {
    if (e?.type !== 'updated' || e.action?.type !== 'success' || !isPersistedKey(e.query.queryKey)) return;
    if (!timer) timer = setTimeout(write, WRITE_DELAY_MS);
  });
  // Ilova fonga ketganda (Telegram yopilganda) kutayotgan yozuv darhol bajariladi
  const flush = () => { if (timer) { clearTimeout(timer); write(); } };
  try { document.addEventListener('visibilitychange', flush); } catch { /* */ }
  return () => { unsub(); clearTimeout(timer); try { document.removeEventListener('visibilitychange', flush); } catch { /* */ } };
}

export function clearPersistedQueries() {
  try { storage()?.removeItem(STORAGE_KEY); } catch { /* */ }
}
