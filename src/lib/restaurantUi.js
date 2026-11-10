/* Restoran sahifasi — sof yordamchilar (hech narsaga bog'liq emas; node --test bilan sinaladi) */

/** Bosh harflar (logotip yo'q bo'lganda belgi uchun): "Ziynat Restaurant" → "ZR", "Choyxona" → "CH", "Tutti" → "TU" */
export function monogram(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '🍽';
  const a = [...parts[0]][0] || '';
  const b = parts.length > 1 ? ([...parts[1]][0] || '') : ([...parts[0]][1] || '');
  return (a + b).toLocaleUpperCase();
}

/** Restoran brend rangi: faqat to'g'ri #RRGGBB qabul qilinadi (aks holda '' — standart yashil). TOTLI, LORUS, ZIYNAT: bir komponent, farq — rang/logo/banner/kontent */
export function brandHex(v) {
  const s = String(v || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : '';
}

/**
 * Brend rangidan CSS o'zgaruvchilari (JS da hisoblanadi — `color-mix` eski iOS/Android WebView'da bo'lmasligi mumkin).
 * Rang yo'q/noto'g'ri bo'lsa — bo'sh obyekt (CSS dagi standart yashil ishlaydi).
 * accent — asosiy; dark — faol chip, logotip, bron banneri (to'q); deep — banner boshlanishi; soft — och fon; rgb — soyalar uchun.
 */
export function brandVars(v) {
  const hex = brandHex(v);
  if (!hex) return {};
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const mix = (k) => c.map((x) => Math.round(x * k)).join(', ');
  const soft = c.map((x) => Math.round(255 - (255 - x) * 0.13)).join(', ');
  return {
    '--rp-accent': hex,
    '--rp-accent-rgb': c.join(', '),
    '--rp-accent-dark': `rgb(${mix(0.58)})`,
    '--rp-accent-deep': `rgb(${mix(0.4)})`,
    '--rp-accent-soft': `rgb(${soft})`,
  };
}

/** Nom emoji bilan boshlansa (do'kon bo'limlari: "🥛 Sut mahsulotlari") ikonka KERAK EMAS — emojining o'zi ikonka */
export const startsWithEmoji = (name) => /^\p{Extended_Pictographic}/u.test(String(name || '').trim());

// [ikonka, kalit so'zlar] — tartib muhim (aniqrog'i oldin)
const RULES = [
  ['skewer', ['shashlik', 'kabob', 'kebab', 'kabab', 'lyulya', 'grill', 'mangal', 'шашлык', 'кебаб']],
  ['soup', ["sho'rva", 'shorva', "sho'rba", 'shurpa', 'sup', 'soup', 'mastava', "lag'mon", 'lagmon', 'суп', 'шурпа']],
  ['leaf', ['salat', 'salad', 'салат', 'vegan']],
  ['burger', ['burger', 'fast', 'pitsa', 'pizza', 'lavash', 'shaurma', 'shawarma', 'hot-dog', 'hotdog', 'sendvich', 'sandwich', 'бургер', 'пицца']],
  ['cup', ['ichimlik', 'drink', 'choy', 'kofe', 'coffee', 'qahva', 'sok', 'sharbat', 'limonad', 'kola', 'напит', 'чай', 'кофе']],
  ['bread', ['non', 'somsa', 'samsa', 'fatir', 'pishiriq', 'bread', 'хлеб', 'самс']],
  ['cake', ['desert', 'dessert', 'shirin', 'tort', 'pirojn', 'sweet', 'muzqaymoq', 'десерт', 'торт']],
  ['bowl', ['milliy', 'osh', 'palov', 'plov', 'manti', 'national', 'плов', 'национ']],
];

/** Bo'lim nomi → ikonka kaliti ('utensils' — mos kelmasa umumiy) */
export function sectionIcon(name, kind) {
  if (kind === 'sale') return 'percent';
  if (kind === 'reviews') return 'star';
  const n = String(name || '').toLowerCase().replace(/[‘’ʻʼ`´]/g, "'");
  for (const [icon, keys] of RULES) if (keys.some((k) => n.includes(k))) return icon;
  return 'utensils';
}
