// ===== KATEGORIYALAR — markaziy ro'yxat =====
// Bosh sahifa va qidiruv filtri shu ro'yxatdan foydalanadi (bir joyda boshqariladi).
//
// RASM QO'SHISH:
//   1. Taom fotosini Cloudinary'ga yuklang (lokmago/categories papkasiga)
//   2. secure_url ni quyidagi `img` maydoniga qo'ying
//   3. Rasm bo'lmasa — chizma (art) ko'rsatiladi, hech qachon bo'sh qolmaydi
//
// Tavsiya: oq fonli PNG (Uzum uslubida), kamida 200x200px.

export const CATEGORIES = [
  {
    id: 'milliy',
    label: 'Milliy taom',
    art: 'milliy',
    img: '', // masalan: 'https://res.cloudinary.com/dnq8oy7l8/image/upload/v1/lokmago/categories/milliy.png'
  },
  { id: 'choyxona', label: 'Choyxona', art: 'choyxona', img: '' },
  { id: 'fastfood', label: 'Fast food', art: 'fastfood', img: '' },
  { id: 'lavash', label: 'Lavash', art: 'lavash', img: '' },
  { id: 'burger', label: 'Burger', art: 'fastfood', img: '' },
  { id: 'pitsa', label: 'Pitsa', art: 'pitsa', img: '' },
  { id: 'sushi', label: 'Sushi', art: 'sushi', img: '' },
  { id: 'shashlik', label: 'Shashlik', art: 'shashlik', img: '' },
  { id: 'tovuq', label: 'Tovuq', art: 'fastfood', img: '' },
  { id: 'shirinlik', label: 'Shirinlik', art: 'shirinlik', img: '' },
  { id: 'salqin', label: 'Ichimlik', art: 'ichimlik', img: '' },
  { id: 'magazin_oziq', label: "Do'konlar", art: 'magazin', img: '' },
];

// Bosh sahifa uchun — "Barchasi" bilan
export const HOME_CATEGORIES = [
  { id: 'all', key: 'all', art: 'all', img: '' },
  ...CATEGORIES,
];
