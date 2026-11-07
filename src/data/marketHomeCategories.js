/*
 * ═══ LOKMA MARKET — BOSH SAHIFA KATEGORIYALARI (yumaloq rasmlar) ═══
 *
 * `key` — UMUMIY KATALOG kaliti (server: constants/catalogCategories.js; mahsulotda `Dish.catalogCategory`). Do'konlar ro'yxati
 * (`productCatalogCategories`) va mahsulotlar (`?catalogCategory=`) shu kalit bo'yicha filtrlanadi.
 *
 * Qator tartibi — AYNAN shu massiv tartibi. Yangi kategoriya qo'shish: bir qator qo'shing (+ `src/assets/market-cats/<key>.webp`).
 * RASM: `src/assets/market-cats/<key>.webp` (160×160, yumaloq, shaffof chekka) — fayl papkaga tushishi bilan O'ZI ulanadi
 * (kalit = fayl nomi). Rasm bo'lmasa — emoji doira (qator hech qachon buzilmaydi). `all.webp` — "Hammasi" kartochkasi.
 *
 * Tayyor, lekin hozir ko'rsatilmaydigan rasmlar (ro'yxatga qo'shilsa chiqadi): kolbasa_sosiska, qogoz_salfetka, guruch_don,
 * yangi_sabzavot, non_mahsulotlari, ziravorlar.
 */
export const MARKET_HOME_CATEGORIES = [
  { key: 'shaxsiy_gigiyena', emoji: '🧴', uz: 'Shaxsiy gigiyena', uzc: 'Шахсий гигиена', ru: 'Личная гигиена' },
  { key: 'maishiy_kimyo', emoji: '🧼', uz: 'Maishiy kimyo', uzc: 'Маиший кимё', ru: 'Бытовая химия' },
  { key: 'bolalar_oziq_ovqatlari', emoji: '🍼', uz: 'Bolalar ovqati', uzc: 'Болалар овқати', ru: 'Детское питание' },
  { key: 'choy', emoji: '🍵', uz: 'Choy', uzc: 'Чой', ru: 'Чай' },
  { key: 'shokolad', emoji: '🍫', uz: 'Shokolad', uzc: 'Шоколад', ru: 'Шоколад' },
  { key: 'uy_rozgor_mahsulotlari', emoji: '🏠', uz: 'Uy-ro‘zg‘or', uzc: 'Уй-рўзғор', ru: 'Для дома' },
  { key: 'pechenye', emoji: '🍪', uz: 'Pechenye', uzc: 'Печенье', ru: 'Печенье' },
  { key: 'konserva_mahsulotlari', emoji: '🥫', uz: 'Konservalar', uzc: 'Консервалар', ru: 'Консервы' },
  { key: 'bolalar_gigiyena', emoji: '🧷', uz: 'Bolalar gigiyenasi', uzc: 'Болалар гигиенаси', ru: 'Детская гигиена' },
  { key: 'konfetlar', emoji: '🍬', uz: 'Konfetlar', uzc: 'Конфетлар', ru: 'Конфеты' },
  { key: 'sut_mahsulotlari', emoji: '🥛', uz: 'Sut mahsulotlari', uzc: 'Сут маҳсулотлари', ru: 'Молочные продукты' },
  { key: 'shirinliklar', emoji: '🍰', uz: 'Shirinliklar', uzc: 'Ширинликлар', ru: 'Сладости' },
  { key: 'gazli_ichimliklar', emoji: '🥤', uz: 'Gazli ichimliklar', uzc: 'Газли ичимликлар', ru: 'Газировка' },
  { key: 'makaron_mahsulotlari', emoji: '🍝', uz: 'Makaron', uzc: 'Макарон', ru: 'Макароны' },
  { key: 'chips_snacklar', emoji: '🥔', uz: 'Chips va snack', uzc: 'Чипс ва снэк', ru: 'Чипсы и снэки' },
  { key: 'muzqaymoq', emoji: '🍦', uz: 'Muzqaymoq', uzc: 'Музқаймоқ', ru: 'Мороженое' },
  { key: 'yangi_meva', emoji: '🍎', uz: 'Yangi mevalar', uzc: 'Янги мевалар', ru: 'Свежие фрукты' },
  { key: 'souslar', emoji: '🍅', uz: 'Souslar', uzc: 'Соуслар', ru: 'Соусы' },
  { key: 'qahva', emoji: '☕', uz: 'Qahva', uzc: 'Қаҳва', ru: 'Кофе' },
  { key: 'tozalash_vositalari', emoji: '🧹', uz: 'Tozalash vositalari', uzc: 'Тозалаш воситалари', ru: 'Чистящие средства' },
  { key: 'ichimliklar', emoji: '🧃', uz: 'Ichimliklar', uzc: 'Ичимликлар', ru: 'Напитки' },
];

export const MARKET_HOME_KEYS = MARKET_HOME_CATEGORIES.map((c) => c.key);

// Fayl nomi = kalit. Vite papkadagi barcha rasmlarni ulaydi (yangi rasm — qo'shimcha kod kerak emas).
const IMAGES = import.meta.glob('/src/assets/market-cats/*.webp', { eager: true, query: '?url', import: 'default' });
const BY_KEY = Object.fromEntries(Object.entries(IMAGES).map(([path, url]) => [path.split('/').pop().replace(/\.webp$/, ''), url]));

/** Kategoriya rasmi (URL) yoki null (emoji ko'rsatiladi). */
export const catImage = (key) => BY_KEY[key] || null;

/** Kategoriya nomi tilga qarab (uz — lotin, uzc — kirill, ru). */
export const homeCatLabel = (c, lang = 'uz') => (c ? (c[lang] || c.uz) : '');

/** Ro'yxatdagi kalitlardan qaysilarida rasm YO'Q (testlar va diagnostika uchun). */
export const missingImages = () => MARKET_HOME_KEYS.filter((k) => !BY_KEY[k]);
