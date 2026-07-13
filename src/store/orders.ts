import { create } from 'zustand';
import { courierNames } from '@/data/mock';
import type { Order, RestaurantCartGroup, SubOrderStatus, Review } from '@/types';

interface OrdersState {
  activeOrder: Order | null;
  pastOrders: Order[];
  reviews: Record<string, Review[]>;
  placeOrder: (groups: RestaurantCartGroup[], total: number, address: string, paymentLabel: string, paymentMethod: 'payme' | 'cash') => Order;
  updateSubOrderStatus: (orderId: string, subId: string, status: SubOrderStatus) => void;
  rateSubOrder: (orderId: string, subId: string, rating: number, comment: string) => void;
  finishOrder: () => void;
}

export const useOrders = create<OrdersState>((set, get) => ({
  activeOrder: null,
  pastOrders: [],
  reviews: {},

  // Buyurtmani restoranlar bo'yicha taqsimlab, bitta "master" buyurtma yaratadi.
  // Har restoran o'z tezligida (dMin-dMax) tayyorlaydi va alohida kuryer yuboradi,
  // lekin mijoz uchun bitta ekranda, bitta buyurtma sifatida ko'rinadi.
  placeOrder: (groups, total, address, paymentLabel, paymentMethod) => {
    const subOrders = groups.map((g, i) => ({
      id: `SUB-${Date.now()}-${i}`,
      restaurant: g.restaurant,
      items: g.items,
      subtotal: g.subtotal,
      etaMinutes: g.restaurant.deliveryMin + Math.round(Math.random() * (g.restaurant.deliveryMax - g.restaurant.deliveryMin)),
      status: 'accepted' as SubOrderStatus,
      courierName: courierNames[i % courierNames.length],
      rated: false,
    }));
    const order: Order = {
      id: 'A' + Math.floor(2000 + Math.random() * 8000),
      subOrders,
      address,
      paymentLabel,
      paymentMethod,
      total,
      createdAt: Date.now(),
    };
    set({ activeOrder: order });
    return order;
  },

  updateSubOrderStatus: (orderId, subId, status) =>
    set((state) => {
      if (!state.activeOrder || state.activeOrder.id !== orderId) return state;
      return {
        activeOrder: {
          ...state.activeOrder,
          subOrders: state.activeOrder.subOrders.map((s) => (s.id === subId ? { ...s, status } : s)),
        },
      };
    }),

  rateSubOrder: (orderId, subId, rating, comment) => {
    const state = get();
    if (!state.activeOrder || state.activeOrder.id !== orderId) return;
    const sub = state.activeOrder.subOrders.find((s) => s.id === subId);
    set({
      activeOrder: {
        ...state.activeOrder,
        subOrders: state.activeOrder.subOrders.map((s) => (s.id === subId ? { ...s, rated: true } : s)),
      },
    });
    if (sub) {
      set((s) => {
        const list = s.reviews[sub.restaurant.id] || [];
        const newReview: Review = { name: 'Siz', rating, comment, date: 'hozir' };
        return { reviews: { ...s.reviews, [sub.restaurant.id]: [newReview, ...list] } };
      });
    }
  },

  finishOrder: () =>
    set((state) => ({
      pastOrders: state.activeOrder ? [state.activeOrder, ...state.pastOrders] : state.pastOrders,
      activeOrder: null,
    })),
}));
