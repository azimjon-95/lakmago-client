export interface Restaurant {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  reviewCount: number;
  deliveryMin: number;
  deliveryMax: number;
  deliveryFee: number; // 0 = bepul
  category: RestaurantCategory;
  tint: string; // fallback fon rangi (rasm bo'lmasa)
  icon: string; // ikon nomi
  discount?: number; // foizda, masalan 30
  isNew?: boolean;
  images?: string[]; // 0, 1 yoki 2 ta "photo" kaliti — bannerda slayder yasaydi
}

export type RestaurantCategory = 'milliy' | 'fastfood' | 'sushi' | 'kafe' | 'shirinlik';

export interface DishOption {
  id: string;
  name: string;
  price: number; // qo'shimcha narx
}

export interface DishOptionGroup {
  id: string;
  title: string;
  required: boolean;
  multiple: boolean; // true = checkbox, false = radio
  options: DishOption[];
}

export interface Dish {
  id: string;
  restaurantId: string;
  section: string; // menyu bo'limi: "Milliy taomlar", "Shashlik"
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  tint: string;
  icon: string;
  photo?: string | null; // "photo style" kaliti — bo'lsa gradient-rasm, bo'lmasa tint+icon fallback
  calories?: number;
  weightGram?: number;
  ingredients?: string[];
  optionGroups?: DishOptionGroup[];
  isHit?: boolean;
  isTrending?: boolean;
  isAvailable?: boolean;
}

export interface CartItem {
  key: string; // dish.id + tanlangan optionlar hash
  dish: Dish;
  quantity: number;
  selectedOptions: DishOption[];
  note?: string;
  unitPrice: number; // dish.price + optionlar
}

// Bitta restoran uchun savatcha guruhi (checkout va sub-order yaratishda ishlatiladi)
export interface RestaurantCartGroup {
  restaurant: Restaurant;
  items: CartItem[];
  subtotal: number;
}

export interface Banner {
  id: string;
  eyebrow: string;
  title: string;
  cta: string;
  bg: string;
  accentText: string;
  ctaBg: string;
  ctaText: string;
  icon: string;
}

export interface SmallBanner {
  id: string;
  eyebrow: string;
  title: string;
  icon: string;
  tint: string;
  iconColor: string;
}

export type SubOrderStatus = 'accepted' | 'preparing' | 'delivering' | 'delivered' | 'cancelled';

// Bitta restorandan yuboriladigan alohida sub-buyurtma — o'z progressi, o'z kuryeri bilan
export interface SubOrder {
  id: string;
  restaurant: Restaurant;
  items: CartItem[];
  subtotal: number;
  etaMinutes: number;
  status: SubOrderStatus;
  courierName: string;
  rated: boolean;
}

// Mijoz buyurtmasi — bir nechta restorandan bo'lishi mumkin, har biri alohida SubOrder
export interface Order {
  id: string;
  subOrders: SubOrder[];
  address: string;
  paymentLabel: string;
  paymentMethod?: 'payme' | 'cash';
  total: number;
  createdAt: number;
}

export interface Address {
  id: string;
  title: string; // "Uy" | "Ish" | "Boshqa"
  address: string;
  lat?: number;
  lng?: number;
}

// Foydalanuvchi profili — Telegram Mini App orqali avtomatik to'ldiriladi
export interface User {
  telegramId: string | null;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
  isPremium: boolean;
  photoUrl: string | null;
  photoInitials: string;
  phone: string | null;
  addresses: Address[];
  defaultAddressId: string | null;
  verified: boolean; // server tomonidan initData tasdiqlangandan keyin true
}

export interface Review {
  name: string;
  rating: number;
  comment: string;
  date: string;
}
