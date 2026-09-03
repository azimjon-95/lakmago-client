import { create } from 'zustand';
import { api } from '@/api';
import { calcDeliveryFee, calcServiceFee } from '@/lib/pricing';

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
    status: o.status === 'pending' ? 'accepted' : o.status, // mijozga pending'ni accepted ko'rsatamiz
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

    // Tekshiruv: savatda eski (mock) ID qolgan bo'lsa — aniq xato beramiz
    for (const g of groups) {
      const rid = pickId(g.restaurant);
      if (!isObjectId(rid)) {
        throw new Error('STALE_CART_ID');
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
        // Server bu qiymatlarni QAYTA hisoblaydi — bu faqat
        // ma'lumot uchun. Mantiq lib/pricing.js da.
        deliveryFee: calcDeliveryFee(g.subtotal, g.restaurant, opts.fulfillment === 'pickup'),
        serviceFee: calcServiceFee(g.subtotal, g.restaurant),
        etaMinutes: g.restaurant.deliveryMin + Math.round(Math.random() * (g.restaurant.deliveryMax - g.restaurant.deliveryMin)),
      })),
    };

    // Backendga yuboramiz (xato bo'lsa yuqoriга uzatiladi — mock yo'q)
    const res = await api.createOrder(payload);
    const groupId = res.groupId;

    /*
     * MUHIM: status qattiq yozilmaydi ('accepted' EMAS).
     *
     * ILGARI bu yerda har doim `status: 'accepted'` deb
     * yozilardi - server buyurtmani 'awaiting_payment' bilan
     * yaratgan bo'lsa ham (karta to'lovi hali amalga
     * oshmagan). Natijada mijoz to'lovni hali boshlamasdan
     * turib "Qabul qilindi" degan progressni ko'rardi.
     *
     * Endi serverning HAQIQIY statusi ishlatiladi. 'pending'
     * (naqd, darhol restoranga ketadi) 'accepted' deb
     * ko'rsatiladi - bu to'g'ri, chunki naqd buyurtma
     * haqiqatan ham qabul qilingan. 'awaiting_payment' esa
     * O'ZGARTIRILMAYDI - pastda activateOrder() shuni
     * tekshiradi va faqat pul yechilgach chaqiriladi.
     */
    const subOrders = res.orders.map((o, i) => {
      const g = groups[i];
      return {
        id: String(o._id),
        backendId: String(o._id),
        restaurant: g?.restaurant || { id: o.restaurantId, name: o.restaurantName },
        items: g?.items || [],
        subtotal: o.subtotal,
        etaMinutes: o.etaMinutes ?? 30,
        status: o.status === 'pending' ? 'accepted' : o.status,
        courierName: o.courierName || courierNames[i % courierNames.length],
        rated: false,
      };
    });

    const order = {
      id: groupId, groupId, subOrders, address, paymentLabel,
      paymentMethod, total, createdAt: Date.now(),
      // To'lov havolasi uchun — birinchi buyurtma ID si
      // (bir nechta restoran bo'lsa har biriga alohida to'lov kerak,
      //  hozircha birinchisiga yo'naltiramiz)
      orderId: res.orders[0] ? String(res.orders[0]._id) : null,
      orderIds: res.orders.map((o) => String(o._id)),
    };

    /*
     * activeOrder FAQAT haqiqatan faol bo'lsa o'rnatiladi -
     * ya'ni hech bo'lmasa bitta sub-buyurtma 'awaiting_payment'
     * DAN BOSHQA holatda bo'lsa.
     *
     * Sof karta to'lovida (barcha sub-buyurtmalar
     * awaiting_payment) - activeOrder BU YERDA
     * o'rnatilmaydi. CartPage.jsx pul yechilganini
     * tasdiqlagach activateOrder() ni chaqiradi.
     */
    const hasConfirmed = subOrders.some((s) => s.status !== 'awaiting_payment');
    if (hasConfirmed) set({ activeOrder: order });

    return order;
  },

  /**
   * Karta to'lovi TASDIQLANGANDAN keyin chaqiriladi
   * (CartPage.jsx, serverdan isPaid:true kelgach).
   * placeOrder() qaytargan `order` obyektini oladi va uni
   * activeOrder qiladi - bu yerda alohida server so'rovi
   * qilinmaydi, chaqiruvchi allaqachon tekshirgan.
   */
  activateOrder: (order) => set({ activeOrder: order }),

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
