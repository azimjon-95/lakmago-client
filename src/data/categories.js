// ===== KATEGORIYALAR — markaziy ro'yxat =====
// Bosh sahifa va qidiruv filtri shu ro'yxatdan foydalanadi (bir joyda boshqariladi).
//
// RASM QO'SHISH:
//   public/categories/<id>.png fayliga rasm tashlang — avtomatik olinadi.
//   Masalan 'osh' kategoriyasi uchun: public/categories/osh.png
//   Rasm yo'q bo'lsa chizma (art) ko'rsatiladi — hech qachon bo'sh qolmaydi.
//
// Tavsiya: oq/shaffof fonli PNG, kamida 200x200px, kvadrat.

export const CATEGORIES = [
  { id: 'milliy', label: 'Milliy taom', art: 'milliy' },
  { id: 'osh', label: 'Osh', art: 'milliy' },
  { id: 'shashlik', label: 'Shashlik', art: 'shashlik' },
  { id: 'sup', label: "Sho'rva", art: 'milliy' },
  { id: 'salat', label: 'Salatlar', art: 'milliy' },
  { id: 'choyxona', label: 'Choyxona', art: 'choyxona' },
  { id: 'zavtroki', label: 'Nonushta', art: 'milliy' },
  { id: 'obed', label: 'Tushlik', art: 'milliy' },
  { id: 'fastfood', label: 'Fast food', art: 'fastfood' },
  { id: 'lavash', label: 'Lavash', art: 'lavash' },
  { id: 'burger', label: 'Burger', art: 'fastfood' },
  { id: 'tovuq', label: 'Tovuq', art: 'fastfood' },
  { id: 'pitsa', label: 'Pitsa', art: 'pitsa' },
  { id: 'sushi', label: 'Sushi', art: 'sushi' },
  { id: 'evropa', label: 'Yevropa', art: 'pitsa' },
  { id: 'turetskaya', label: 'Turk taomlari', art: 'shashlik' },
  { id: 'koffe', label: 'Qahva', art: 'ichimlik' },
  { id: 'shirinlik', label: 'Shirinlik', art: 'shirinlik' },
  { id: 'salqin', label: 'Ichimlik', art: 'ichimlik' },
  { id: 'magazin_oziq', label: "Do'konlar", art: 'magazin' },
];

// Bosh sahifa uchun. "Barchasi" tugmasi yo'q — standart holatda
// hech biri tanlanmaydi va barcha taomlar ko'rinadi.
// Tanlangan kategoriyani qayta bosish tanlovni bekor qiladi.
export const HOME_CATEGORIES = CATEGORIES;
