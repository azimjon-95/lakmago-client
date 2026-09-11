// ===== KATEGORIYALAR — markaziy ro'yxat =====
export const CATEGORIES = [
  { id: 'milliy', label: 'Milliy taom', art: 'milliy' },
  { id: 'osh', label: 'Osh', art: 'milliy' },
  { id: 'shashlik', label: 'Shashlik', art: 'shashlik' },
  { id: 'sup', label: "Sho'rva", art: 'milliy' },
  { id: 'salat', label: 'Salatlar', art: 'milliy', img: '/categories/salat.png' },
  { id: 'choyxona', label: 'Choyxona', art: 'choyxona', img: '/categories/choy.png' },
  { id: 'zavtroki', label: 'Nonushta', art: 'milliy' },
  { id: 'obed', label: 'Issiq taomlar', art: 'milliy' },
  { id: 'fastfood', label: 'Fast food', art: 'fastfood', img: '/categories/fastfood.png' },
  { id: 'lavash', label: 'Lavash', art: 'lavash' },
  { id: 'burger', label: 'Burger', art: 'fastfood' },
  { id: 'tovuq', label: 'Tovuq', art: 'fastfood' },
  { id: 'pitsa', label: 'Pitsa', art: 'pitsa' },
  { id: 'sushi', label: 'Sushi', art: 'sushi' },
  { id: 'evropa', label: 'Yevropa', art: 'pitsa' },
  { id: 'turetskaya', label: 'Turk taomlari', art: 'shashlik' },
  { id: 'koffe', label: 'Qahva', art: 'ichimlik' },
  { id: 'shirinlik', label: 'Shirinlik', art: 'shirinlik' },
  { id: 'salqin', label: 'Ichimlik', art: 'ichimlik', img: '/categories/ichimlik.png' },
  { id: 'magazin_oziq', label: 'Gazaklar', art: 'milliy', img: '/categories/gazaklar.png' },
  { id: 'sous', label: 'Souslar', art: 'milliy' , img: '/categories/sous.png' },
  { id: 'non', label: 'Nonlar', art: 'milliy', img: '/categories/non.jpg' },
  { id: 'boks', label: 'Bokslar', art: 'fastfood' , img: '/categories/box.png' },
];

export const HOME_CATEGORIES = CATEGORIES;

export function shuffled(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}


/*
 * ═══ ESKI (LEGACY) KATEGORIYA NOMLARI ═══
 *
 * Bazada ba'zi taomlar eski nom bilan saqlangan ('shorva',
 * 'ichimlik', 'issiq' ...). Ilova esa faqat yangi id'larni
 * biladi. Shu xarita tufayli "Sho'rva" tanlanganda 'shorva'
 * deb saqlangan taomlar ham topiladi.
 *
 * MUHIM: serverdagi src/constants/dishCategories.js
 * (DISH_CATEGORY_ALIASES) bilan BIR XIL bo'lishi shart.
 */
export const CATEGORY_ALIASES = Object.freeze({
  sup: ['sup', 'shorva'],
  salqin: ['salqin', 'ichimlik'],
  zavtroki: ['zavtroki', 'nonushta'],
  non: ['non', 'nonvoyxona'],
  obed: ['obed', 'issiq'],
  shashlik: ['shashlik', 'grill'],
});

/** Kategoriya id'siga mos keladigan barcha qiymatlar (alias bilan). */
export function categoryValues(categoryId) {
  return CATEGORY_ALIASES[categoryId] || [categoryId];
}

/** Ro'yxatda mavjud (ma'lum) kategoriya id'simi. */
export function isKnownCategory(categoryId) {
  return CATEGORIES.some((c) => c.id === categoryId);
}

function valueMatches(raw, values) {
  if (Array.isArray(raw)) return raw.some((v) => values.includes(v));
  if (typeof raw === 'string' && raw) return values.includes(raw);
  return false;
}

export function dishMatchesCategory(dish, categoryId) {
  if (!categoryId || categoryId === 'all') return true;
  if (!dish) return false;
  const values = categoryValues(categoryId);
  if (valueMatches(dish.category, values)) return true;
  // `category` bo'sh bo'lsa — eski `categories` massiviga qaraymiz
  if (!dish.category && valueMatches(dish.categories, values)) return true;
  return false;
}

export function restaurantMatchesCategory(restaurant, categoryId) {
  if (!categoryId || categoryId === 'all') return true;
  if (!restaurant) return false;
  const values = categoryValues(categoryId);
  return (
    valueMatches(restaurant.category, values)
    || valueMatches(restaurant.dishCategories, values)
    || valueMatches(restaurant.categories, values)
  );
}

export function filterByCategory(items, categoryId, matcher) {
  if (!categoryId || categoryId === 'all') return items;
  return items.filter((item) => matcher(item, categoryId));
}
