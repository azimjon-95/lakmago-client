import { isNativeApp } from './clientInfo';

/*
 * ═══════════════════════════════════════════════════════════
 * JIM YANGILANISH (veb-qism) — faqat iOS / Android ilova
 * ═══════════════════════════════════════════════════════════
 *
 * Ilova ichidagi veb-kod saytdagi (Vercel) eng so'nggi versiyaga o'zi yangilanadi —
 * do'kon va mijoz roziligi kerak emas:
 *
 *   1. lokma.uz/ota/manifest.json o'qiladi (scripts/build-ota.mjs yaratadi)
 *   2. versiya yangi VA native izi bir xil → plagin FAQAT o'zgargan fayllarni fonda yuklaydi
 *      (har fayl sha256 bilan tekshiriladi)
 *   3. qo'llanadi: keyingi ochilishda (splash paytida) yoki ilova fonda 10 daqiqadan ko'p
 *      turib bosh sahifaga qaytganda. To'lov sahifasiga chiqib-qaytishda HECH QACHON
 *      qayta yuklanmaydi (qisqa fon), savat/buyurtma oqimi buzilmaydi.
 *   4. yangi versiya 10 s ichida "tayyorman" demasa (notifyAppReady) — plagin oldingisiga
 *      qaytaradi; bunday versiya 2 urinishdan keyin tashlab qo'yiladi.
 *
 * Native izi boshqa (yangi plagin qo'shilgan) → 'native_required': do'kon orqali yangilash
 * (lib/appUpdate.js — Android Google Play, iPhone taklif). Har qanday xato — jim.
 */
export const OTA_BASE = (import.meta.env.VITE_OTA_BASE || 'https://lokma.uz').replace(/\/+$/, '');
export const READY_KEY = 'lokma_ota_ready_v1';     // { id, version } — yuklangan, qo'llashga tayyor
export const FAIL_KEY = 'lokma_ota_fail_v1';       // { version, attempts }
export const MAX_ATTEMPTS = 2;
export const APPLY_AFTER_BACKGROUND_MS = 10 * 60_000;

export const CURRENT_VERSION = typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : 'dev';
export const NATIVE_FP = typeof __NATIVE_FP__ !== 'undefined' ? __NATIVE_FP__ : '';

const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const write = (k, v) => { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };

/** Sof qaror (test qilinadi) */
export function decideLive({ manifest, current = CURRENT_VERSION, nativeFp = NATIVE_FP, failed = null }) {
  if (!manifest || typeof manifest !== 'object' || !/^[\w.-]{6,40}$/.test(String(manifest.version || ''))) return 'none';
  if (!Array.isArray(manifest.files) || !manifest.files.some((f) => f?.file_name === 'index.html')) return 'none';
  if (manifest.version === current) return 'none';
  if (!nativeFp || manifest.native !== nativeFp) return 'native_required';
  if (failed && failed.version === manifest.version && failed.attempts >= MAX_ATTEMPTS) return 'none';
  return 'download';
}

/** Manifest → plagin formati (to'liq URL; yo'l chetga chiqa olmaydi) */
export function toPluginManifest(manifest, base = OTA_BASE) {
  return manifest.files
    .filter((f) => f && typeof f.file_name === 'string' && /^[a-f0-9]{64}$/.test(f.file_hash || '')
      && !f.file_name.startsWith('/') && !f.file_name.split('/').includes('..'))
    .map((f) => ({
      file_name: f.file_name,
      file_hash: f.file_hash,
      download_url: `${base}/${f.file_name.split('/').map(encodeURIComponent).join('/')}`,
    }));
}

let plugin = null;
async function updater() {
  if (!plugin) plugin = (await import('@capgo/capacitor-updater')).CapacitorUpdater;
  return plugin;
}

/**
 * Ilova ochilishida (main.jsx, render'dan oldin): joriy versiya "tayyor" deb belgilanadi
 * (aks holda plagin 10 s da oldingisiga qaytaradi) va oldin yuklangan yangi versiya bo'lsa —
 * darhol qo'llanadi (splash paytida, mijoz sezmaydi).
 */
export async function liveUpdateBoot() {
  if (!isNativeApp()) return;
  try {
    const U = await updater();
    await U.notifyAppReady();
    const ready = read(READY_KEY);
    if (!ready) return;
    if (ready.version === CURRENT_VERSION) { write(READY_KEY, null); write(FAIL_KEY, null); return; } // qo'llangan
    await applyReady(U, ready);
  } catch { /* jim */ }
}

async function applyReady(U, ready) {
  const fail = read(FAIL_KEY);
  const attempts = fail?.version === ready.version ? fail.attempts : 0;
  if (attempts >= MAX_ATTEMPTS) { write(READY_KEY, null); return false; }
  const list = await U.list().catch(() => ({ bundles: [] }));
  const b = (list.bundles || []).find((x) => x.id === ready.id);
  if (!b || b.status === 'error' || b.status === 'deleted') { write(READY_KEY, null); return false; }
  write(FAIL_KEY, { version: ready.version, attempts: attempts + 1 }); // yangi versiya ochilsa — tozalanadi (boot)
  await U.set({ id: ready.id }); // ilova shu yerda qayta yuklanadi
  return true;
}

/**
 * Yangilanishni tekshirish va fonda yuklash.
 * @returns 'none' | 'ready' | 'native_required' | 'error'
 */
export async function checkLiveUpdate({ fetchImpl = fetch } = {}) {
  if (!isNativeApp()) return 'none';
  try {
    const res = await fetchImpl(`${OTA_BASE}/ota/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return 'none';
    const manifest = await res.json();
    const verdict = decideLive({ manifest, failed: read(FAIL_KEY) });
    if (verdict !== 'download') return verdict;

    const ready = read(READY_KEY);
    if (ready?.version === manifest.version) return 'ready';

    const U = await updater();
    const existing = ((await U.list().catch(() => ({ bundles: [] }))).bundles || [])
      .find((x) => x.version === manifest.version && x.status !== 'error' && x.status !== 'deleted' && x.status !== 'downloading');
    const bundle = existing || await U.download({ url: `${OTA_BASE}/index.html`, version: manifest.version, manifest: toPluginManifest(manifest) });
    write(READY_KEY, { id: bundle.id, version: manifest.version });
    return 'ready';
  } catch {
    return 'error';
  }
}

/** Fondan qaytganda: uzoq turgan bo'lsa va bosh sahifada bo'lsa — tayyor versiyani qo'llaydi */
export async function applyIfIdle({ backgroundMs, onHome }) {
  if (!isNativeApp() || !onHome || backgroundMs < APPLY_AFTER_BACKGROUND_MS) return false;
  const ready = read(READY_KEY);
  if (!ready || ready.version === CURRENT_VERSION) return false;
  try { return await applyReady(await updater(), ready); } catch { return false; }
}
