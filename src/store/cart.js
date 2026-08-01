import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';














function buildKey(dishId, options) {
  const optIds = options.map((o) => o.id).sort().join('-');
  return `${dishId}__${optIds}`;
}

function unitPrice(dish, options) {
  return dish.price + options.reduce((sum, o) => sum + o.price, 0);
}

export const useCart = create(
  persist(
    (set, get) => ({
  items: [],

  addItem: (dish, quantity, selectedOptions, note) => {
    const key = buildKey(dish.id, selectedOptions);
    set((state) => {
      const existing = state.items.find((i) => i.key === key);
      let items;
      if (existing) {
        items = state.items.map((i) =>
        i.key === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        items = [
        ...state.items,
        { key, dish, quantity, selectedOptions, note, unitPrice: unitPrice(dish, selectedOptions) }];

      }
      return { items };
    });
  },

  incrementByDish: (dishId) => {
    const item = get().items.find((i) => i.dish.id === dishId);
    if (item) get().addItem(item.dish, 1, item.selectedOptions, item.note);
  },

  decrement: (key) =>
  set((state) => ({
    items: state.items.
    map((i) => i.key === key ? { ...i, quantity: i.quantity - 1 } : i).
    filter((i) => i.quantity > 0)
  })),

  removeItem: (key) =>
  set((state) => ({ items: state.items.filter((i) => i.key !== key) })),

  clear: () => set({ items: [] }),

  totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),

  totalPrice: () => get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0),

  // Savatchani restoranlar bo'yicha guruhlash — checkout va ko'p-restoranli
  // buyurtma yaratishda ishlatiladi (har restoran o'z sub-buyurtmasini oladi)
  // Restoran ma'lumoti taomning o'zidan olinadi (mock'ga bog'liq emas)
  restaurantGroups: () => {
    const map = new Map();
    get().items.forEach((item) => {
      const rid = item.dish.restaurantId;
      if (!map.has(rid)) map.set(rid, { items: [], meta: item.dish });
      map.get(rid).items.push(item);
    });
    return Array.from(map.entries()).map(([restaurantId, { items, meta }]) => ({
      restaurant: {
        id: restaurantId,
        name: meta.restaurantName || meta.restaurant?.name || 'Restoran',
        tint: meta.restaurantTint || meta.restaurant?.tint || '#3D2A10',
        icon: meta.restaurantIcon || meta.restaurant?.icon || 'tools-kitchen-2',
        deliveryMin: meta.restaurantDeliveryMin ?? meta.restaurant?.deliveryMin ?? 25,
        deliveryMax: meta.restaurantDeliveryMax ?? meta.restaurant?.deliveryMax ?? 40,
        deliveryFee: meta.restaurantDeliveryFee ?? meta.restaurant?.deliveryFee ?? 0,
        // Yetkazish shartlari — savatda hisob uchun
        freeDeliveryThreshold:
          meta.restaurantFreeDeliveryThreshold ?? meta.restaurant?.freeDeliveryThreshold ?? 0,
        minOrderAmount:
          meta.restaurantMinOrderAmount ?? meta.restaurant?.minOrderAmount ?? 0,
        prepMinutes: meta.restaurantPrepMinutes ?? meta.restaurant?.prepMinutes ?? 20,
      },
      items,
      subtotal: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
    }));
  }
}),
    {
      name: 'lokma-cart',
      storage: createJSONStorage(() => localStorage),
      // Faqat taomlar saqlanadi — funksiyalar emas
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
