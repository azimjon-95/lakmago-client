import { latinToCyrillic } from './translitUz';

/* HTML teglar (<b>) o'girilmaydi — faqat matn qismi */
const cyr = (s) => String(s).split(/(<[^>]+>)/g).map((x) => (x.startsWith('<') ? x : latinToCyrillic(x))).join('');
function deep(v, fn) {
  if (typeof v === 'string') return fn(v);
  if (Array.isArray(v)) return v.map((x) => deep(x, fn));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x, fn)]));
  return v;
}
const cache = new Map();
/** raw = { uz, ru }. lang: 'uz' | 'uzc' | 'ru'. uzc — uz'dan avtomatik kirill (bir marta hisoblanadi). */
export function localized(raw, lang, name = '') {
  if (lang === 'ru') return raw.ru;
  if (lang !== 'uzc') return raw.uz;
  const key = `${name}|uzc`;
  if (!cache.has(key)) cache.set(key, deep(raw.uz, cyr));
  return cache.get(key);
}
