import { create } from 'zustand';
import { api } from '@/api';

// Kuryer nomlari (backend courierName bermasa ehtiyot uchun)
const courierNames = ['Aziz', 'Bek', 'Dilshod', 'Jasur', 'Sardor', "Ulug'bek"];

// Backenddan kelgan Order'larni mijoz ekranidagi "subOrder" formatiga o'giradi.
function toSubOrder(o, i) {
  return {
    id: String(o._id),
    backendId: String(o._id),
    restaurant: o.restaurant || { id: o.restaurantId, name: o.restaurantName, tint: '#3D2A10', icon: 'ti-tools-kitchen-2', deliveryMin: 25, deliveryMax: 40 },
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
  placeOrder: async (groups, total, address, paymentLabel, paymentMethod, phone, useBonus = 0, opts = {}) => {
    // MongoDB ObjectId formatи (24 belgili hex) — eski/noto'g'ri ID'ni oldindan aniqlaymiz
    const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
    const pickId = (obj) => String(obj?._id || obj?.id || '');

    // Tekshiruv: savatда eski (mock) ID qolган bo'lsa — aniq xato beramiz
    for (const g of groups) {
      const rid = pickId(g.restaurant);
      if (!isObjectId(rid)) {
        throw new Error('Savatда eski ma\u2018lumot bor. Savatni tozalab, qaytadan tanlang.');
      }
    }

    // Backend uchun payload
    const payload = {
      address,
      phone,
      paymentMethod: paymentMethod === 'payme' ? 'payme' : paymentMethod === 'cash' ? 'cash' : 'payme',
      paymentLabel,
      useBonus,
      // Yetkazish turi va vaqt (olib ketish / belgilangan vaqt)
      fulfillment: opts.fulfillment || 'delivery',
      timingMode: opts.timingMode || 'asap',
      ...(opts.scheduledFor ? { scheduledFor: opts.scheduledFor } : {}),
      orders: groups.map((g) => ({
        restaurantId: pickId(g.restaurant),
        restaurantName: g.restaurant.name,
        items: g.items.map((it) => ({
          dishId: pickId(it.dish),
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

    // Backendga yuboramiz (xato bo'lsa yuqoriга uzatiladi — mock yo'q)
    const res = await api.createOrder(payload);
    const groupId = res.groupId;
    const subOrders = res.orders.map((o, i) => {
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

    const order = { id: groupId, groupId, subOrders, address, paymentLabel, paymentMethod, total, createdAt: Date.now() };
    set({ activeOrder: order });
    return order;
  },

  // Faol buyurtmani backenddan tiklash (sahifa yangilanганda)
  loadActive: async () => {
    try {
      const orders = await api.getActiveOrders();
      if (!orders || orders.length === 0) return;
      const groupId = orders[0].groupId;
      const sameGroup = orders.filter((o) => o.groupId === groupId);
      const subOrders = sameGroup.map(toSubOrder);
      const total = sameGroup.reduce((s, o) => s + o.total, 0);
      set({ activeOrder: { id: groupId, groupId, subOrders, address: sameGroup[0].address, total, createdAt: Date.now() } });
    } catch {
      // e'tiborsiz (faol buyurtma yo'q yoki tarmoq xatosi)
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
