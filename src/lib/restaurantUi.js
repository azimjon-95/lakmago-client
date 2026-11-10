/* Restoran sahifasi — sof yordamchilar (hech narsaga bog'liq emas; node --test bilan sinaladi) */

/** Bosh harflar (logotip yo'q bo'lganda belgi uchun): "Ziynat Restaurant" → "ZR", "Choyxona" → "CH", "Tutti" → "TU" */
export function monogram(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '🍽';
  const a = [...parts[0]][0] || '';
  const b = parts.length > 1 ? ([...parts[1]][0] || '') : ([...parts[0]][1] || '');
  return (a + b).toLocaleUpperCase();
}

/** Nom uzunligiga qarab shrift (px): qisqa — katta, uzun — kichikroq; hammasi bir xil ko'rinishda sig'adi */
export function nameFontSize(name) {
  const n = String(name || '').length;
  if (n <= 14) return 26;
  if (n <= 20) return 23;
  if (n <= 28) return 20;
  return 18;
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
