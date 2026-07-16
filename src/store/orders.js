import { create } from 'zustand';
import { api } from '@/api';
import { courierNames } from '@/data/mock';

// Demo rejim (backend yo'q) bo'lsa local simulyatsiya ishlaydi.
const DEMO = (import.meta.env.VITE_API_URL ?? '/api') === 'mock';

// Backenddan kelgan Order'larni mijoz ekranidagi "subOrder" formatiga o'giradi.
function toSubOrder(o, i) {
  return {
    id: String(o._id),
    backendId: String(o._id),
    restaurant: o.restaurant || { id: o.restaurantId, name: o.restaurantName, tint: '#3A2A12', icon: 'ti-tools-kitchen-2', deliveryMin: 25, deliveryMax: 40 },
    items: o.items?.map((it) => ({ dish: { name: it.name, ...it }, quantity: it.quantity, unitPrice: it.unitPrice })) || o.itemsRaw || [],
    subtotal: o.subtotal,
    etaMinutes: o.etaMinutes ?? 30,
    status: o.status === 'pending' ? 'accepted' : o.status, // mijozга pending'ni accepted ko'rsatamiz
    courierName: o.courierName || courierNames[i % courierNames.length],
    rated: !!o.rating,
  };
}

export const useOrders = create((set, get) => ({
  activeOrder: null,
  pastOrders: [],
  reviews: {},

  // Buyurtma berish — backendga batch yuboradi, javobni activeOrder qiladi.
  placeOrder: async (groups, total, address, paymentLabel, paymentMethod, phone, useBonus = 0) => {
    // Backend uchun payload
    const payload = {
      address,
      phone,
      paymentMethod: paymentMethod === 'payme' ? 'payme' : paymentMethod === 'cash' ? 'cash' : 'payme',
      paymentLabel,
      useBonus,
      orders: groups.map((g) => ({
        restaurantId: g.restaurant.id,
        restaurantName: g.restaurant.name,
        items: g.items.map((it) => ({
          dishId: it.dish.id,
          name: it.dish.name,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          selectedOptions: it.selectedOptions?.map((o) => ({ name: o.name, price: o.price })) || [],
          note: it.note,
        })),
        subtotal: g.subtotal,
        deliveryFee: g.restaurant.deliveryFee || 0,
        serviceFee: 0,
        etaMinutes: g.restaurant.deliveryMin + Math.round(Math.random() * (g.restaurant.deliveryMax - g.restaurant.deliveryMin)),
      })),
    };

    let groupId = 'G' + Date.now();
    let subOrders;

    try {
      const res = await api.createOrder(payload);
      groupId = res.groupId;
      // Backend javobidagi order'larни, lekin to'liq restaurant obyekti bilan (mijoz ekrani uchun) birlashtiramiz
      subOrders = res.orders.map((o, i) => {
        const g = groups[i];
        return {
          id: String(o._id),
          backendId: String(o._id),
          restaurant: g?.restaurant || { id: o.restaurantId, name: o.restaurantName },
          items: g?.items || [],
          subtotal: o.subtotal,
          etaMinutes: o.etaMinutes ?? 30,
          status: 'accepted',
          courierName: o.courierName || courierNames[i % courierNames.length],
          rated: false,
        };
      });
    } catch {
      // Backend yo'q — local simulyatsiya
      subOrders = groups.map((g, i) => ({
        id: `SUB-${Date.now()}-${i}`,
        backendId: null,
        restaurant: g.restaurant,
        items: g.items,
        subtotal: g.subtotal,
        etaMinutes: g.restaurant.deliveryMin + Math.round(Math.random() * (g.restaurant.deliveryMax - g.restaurant.deliveryMin)),
        status: 'accepted',
        courierName: courierNames[i % courierNames.length],
        rated: false,
      }));
    }

    const order = { id: groupId, groupId, subOrders, address, paymentLabel, paymentMethod, total, createdAt: Date.now() };
    set({ activeOrder: order });
    return order;
  },

  // Faol buyurtmani backenddan tiklash (sahifa yangilanганda)
  loadActive: async () => {
    if (DEMO) return;
    try {
      const orders = await api.getActiveOrders();
      if (!orders || orders.length === 0) return;
      // groupId bo'yicha guruhlash
      const groupId = orders[0].groupId;
      const sameGroup = orders.filter((o) => o.groupId === groupId);
      const subOrders = sameGroup.map(toSubOrder);
      const total = sameGroup.reduce((s, o) => s + o.total, 0);
      set({ activeOrder: { id: groupId, groupId, subOrders, address: sameGroup[0].address, total, createdAt: Date.now() } });
    } catch {
      // e'tiborsiz
    }
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

  // Socket'dan kelgan status (backendId bo'yicha topadi)
  applyBackendStatus: (backendId, status) =>
    set((state) => {
      if (!state.activeOrder) return state;
      const mapped = status === 'pending' ? 'accepted' : status;
      return {
        activeOrder: {
          ...state.activeOrder,
          subOrders: state.activeOrder.subOrders.map((s) =>
            s.backendId === backendId ? { ...s, status: mapped } : s,
          ),
        },
      };
    }),

  // Mijoz "Ha, oldim" + baho
  rateSubOrder: async (orderId, subId, rating, comment) => {
    const state = get();
    if (!state.activeOrder || state.activeOrder.id !== orderId) return;
    const sub = state.activeOrder.subOrders.find((s) => s.id === subId);

    // Backendga yuborish (backendId bor bo'lsa)
    if (sub?.backendId && !DEMO) {
      try { await api.confirmDelivery(sub.backendId, rating, comment); } catch { /* ignore */ }
    }

    set({
      activeOrder: {
        ...state.activeOrder,
        subOrders: state.activeOrder.subOrders.map((s) => (s.id === subId ? { ...s, rated: true, status: 'delivered' } : s)),
      },
    });
    if (sub) {
      set((s) => {
        const list = s.reviews[sub.restaurant.id] || [];
        const newReview = { name: 'Siz', rating, comment, date: 'hozir' };
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
