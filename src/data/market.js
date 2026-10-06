/*
 * Lokma Market — mijoz tomonidagi kichik yordamchilar.
 * Kategoriyalar ro'yxati SERVERDAN keladi (GET /api/market/categories) —
 * bu yerda faqat ko'rsatish uchun birlik nomlari (server yangilanmagan
 * bo'lsa ham karta buzilmasin).
 */
const UNIT = {
  uz: { dona: 'dona', kg: 'kg', g: 'g', l: 'l', ml: 'ml', qadoq: 'qadoq', bog: "bog'", blok: 'blok' },
  uzc: { dona: 'дона', kg: 'кг', g: 'г', l: 'л', ml: 'мл', qadoq: 'қадоқ', bog: 'боғ', blok: 'блок' },
  ru: { dona: 'шт', kg: 'кг', g: 'г', l: 'л', ml: 'мл', qadoq: 'уп.', bog: 'пучок', blok: 'блок' },
};

/** "kg" → "/ kg". Birlik yo'q (restoran taomi) — bo'sh satr. */
export function unitSuffix(unit, lang = 'uz') {
  if (!unit) return '';
  const label = (UNIT[lang] || UNIT.uz)[unit] || unit;
  return `/ ${label}`;
}

/** Kategoriya nomi tilga qarab (server: label — o'zbekcha, ru — ruscha). */
export function marketCatLabel(c, lang = 'uz') {
  if (!c) return '';
  return lang === 'ru' ? (c.ru || c.label) : c.label;
}

/** Do'kon mahsulotimi (restoran taomi emas). */
export const isMarketProduct = (d) => Boolean(d?.marketCategory);
