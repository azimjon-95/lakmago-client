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


export function dishMatchesCategory(dish, categoryId) {
  if (!categoryId || categoryId === 'all') return true;
  if (!dish) return false;
  const raw = dish.category;
  if (Array.isArray(raw)) return raw.includes(categoryId);
  if (typeof raw === 'string' && raw) return raw === categoryId;
  if (Array.isArray(dish.categories)) return dish.categories.includes(categoryId);
  return false;
}

export function restaurantMatchesCategory(restaurant, categoryId) {
  if (!categoryId || categoryId === 'all') return true;
  if (!restaurant) return false;
  if (restaurant.category === categoryId) return true;
  const dc = restaurant.dishCategories;
  if (Array.isArray(dc) && dc.includes(categoryId)) return true;
  if (Array.isArray(restaurant.categories) && restaurant.categories.includes(categoryId)) {
    return true;
  }
  return false;
}

export function filterByCategory(items, categoryId, matcher) {
  if (!categoryId || categoryId === 'all') return items;
  return items.filter((item) => matcher(item, categoryId));
}