/*
 * ═══════════════════════════════════════════════════════════
 * JIM YANGILANISH MANIFESTI — `npm run build` dan keyin (Vercel)
 * ═══════════════════════════════════════════════════════════
 *
 * dist/ota/manifest.json:
 *   { version, native, files: [{ file_name, file_hash (sha256) }], size, createdAt }
 *
 * Fayllarning o'zi saytda allaqachon bor (lokma.uz/<file_name>) — alohida zip yo'q.
 * iOS/Android ilova (lib/liveUpdate.js) manifestni o'qiydi; versiya yangi va native izi
 * bir xil bo'lsa — plagin (@capgo/capacitor-updater, manifest rejimi) FAQAT O'ZGARGAN
 * fayllarni yuklaydi: qolganlari ilova ichidagi yoki oldin yuklangan nusxadan olinadi,
 * har fayl sha256 bilan tekshiriladi. Odatda yangilanish — bir necha yuz KB.
 *
 * XAVFSIZLIK SHARTI: manifest FAQAT VITE_API_URL to'liq https manzil bo'lsa yaratiladi —
 * aks holda ilova ichida '/api' ishlamaydi va yangilangan ilova serverga ulana olmaydi.
 * Skript HECH QACHON build'ni yiqitmaydi (sayt deploy'i to'xtamasin): xatoda ogohlantiradi.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();

/** dist ichidagi barcha fayllar (ota/ dan tashqari), saralangan */
export function listFiles(dir, base = dir, out = []) {
  for (const name of fs.readdirSync(dir).sort()) {
    const full = path.join(dir, name);
    const rel = path.relative(base, full).split(path.sep).join('/');
    if (rel === 'ota' || rel.startsWith('ota/')) continue;
    if (fs.statSync(full).isDirectory()) listFiles(full, base, out);
    else out.push(rel);
  }
  return out;
}

const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

export async function buildOta({ dist = path.join(ROOT, 'dist'), env = process.env, nativeFp } = {}) {
  const api = env.VITE_API_URL || '';
  if (!/^https:\/\//.test(api)) return { skipped: 'VITE_API_URL to‘liq https emas — jim yangilanish manifesti yaratilmadi' };
  if (!fs.existsSync(path.join(dist, 'index.html'))) return { skipped: 'dist/index.html yo‘q' };

  const version = String(env.VERCEL_GIT_COMMIT_SHA || env.OTA_VERSION || '').slice(0, 40);
  if (!/^[\w.-]{6,40}$/.test(version)) return { skipped: 'versiya (commit) aniqlanmadi' };

  const fp = nativeFp ?? (await import(pathToFileURL(path.join(ROOT, 'vite.config.js')).href)).nativeFingerprint(ROOT);
  let size = 0;
  const files = listFiles(dist).map((rel) => {
    const full = path.join(dist, rel);
    size += fs.statSync(full).size;
    return { file_name: rel, file_hash: sha256(full) };
  });
  const manifest = { version, native: fp, files, size, createdAt: new Date().toISOString() };
  fs.mkdirSync(path.join(dist, 'ota'), { recursive: true });
  fs.writeFileSync(path.join(dist, 'ota', 'manifest.json'), JSON.stringify(manifest));
  return { manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const r = await buildOta();
    if (r.skipped) console.warn(`[ota] ${r.skipped}`);
    else console.log(`[ota] ${r.manifest.version} · ${r.manifest.files.length} fayl · native ${r.manifest.native}`);
  } catch (e) {
    console.warn('[ota] manifest yaratilmadi (sayt build’i davom etadi):', e?.message || e);
  }
}
