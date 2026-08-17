// ===== KATEGORIYALAR — markaziy ro'yxat =====
// Bosh sahifa va qidiruv filtri shu ro'yxatdan foydalanadi.
//
// RASM public/categories/<id>.png orqali olinadi.
// Rasm yo'q bo'lsa chizma (art) ko'rsatiladi.

export const CATEGORIES = [
  { id: 'milliy', label: 'Milliy taom', art: 'milliy' },
  { id: 'osh', label: 'Osh', art: 'milliy' },
  { id: 'shashlik', label: 'Shashlik', art: 'shashlik' },
  { id: 'sup', label: "Sho'rva", art: 'milliy' },

  // Yangi rasm
  { id: 'salat', label: 'Salatlar', art: 'milliy', img: '/categories/salat.png' },

  // Yangi rasm
  { id: 'choyxona', label: 'Choyxona', art: 'choyxona', img: '/categories/choyxona.png' },

  { id: 'zavtroki', label: 'Nonushta', art: 'milliy' },
  { id: 'obed', label: 'Tushlik', art: 'milliy' },

  // Yangi rasm
  { id: 'fastfood', label: 'Fast food', art: 'fastfood', img: '/categories/fastfood.png' },

  { id: 'lavash', label: 'Lavash', art: 'lavash' },
  { id: 'burger', label: 'Burger', art: 'fastfood' },
  { id: 'tovuq', label: 'Tovuq', art: 'fastfood' },
  { id: 'pitsa', label: 'Pitsa', art: 'pitsa' },
  { id: 'sushi', label: 'Sushi', art: 'sushi' },
  { id: 'evropa', label: 'Yevropa', art: 'pitsa' },
  { id: 'turetskaya', label: 'Turk taomlari', art: 'shashlik' },

  // Yangi rasm
  { id: 'koffe', label: 'Qahva', art: 'ichimlik' },

  { id: 'shirinlik', label: 'Shirinlik', art: 'shirinlik' },

  // Shu rasm Ichimlik kategoriyasiga ham ishlatiladi
  { id: 'salqin', label: 'Ichimlik', art: 'ichimlik', img: '/categories/ichimlik.png' },

  { id: 'gazak', label: 'Gazaklar', art: 'milliy' },
];

export const HOME_CATEGORIES = CATEGORIES;