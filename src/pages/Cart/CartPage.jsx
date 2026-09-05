import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { AddressSheet } from '@/components/AddressSheet';
import { OrderConfirmModal } from '@/components/OrderConfirmModal';
import { AddressFlow } from '@/components/AddressFlow/AddressFlow';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { useOrders } from '@/store/orders';
import { useT } from '@/i18n';
import { formatSom } from '@/lib/utils';
import { calcDeliveryFee, calcServiceFee, checkMinOrder, freeDeliveryGap, calcPickupDiscount } from '@/lib/pricing';
import { isOpenNow } from '@/lib/workHours';
import { useCartCleanup } from '@/hooks/useCartCleanup';
import { api } from '@/api';
import { haptic, getTelegram } from '@/lib/telegram';
import { useDishes, useRestaurants } from '@/hooks/queries';
import { savePendingPayment, getPendingPayments, clearPendingPayment } from '@/lib/pendingPayment';
import './Cart.css';


/*
 * To'lov provayderi -> ko'rsatiladigan nom.
 *
 * BITTA JOYDA: buyurtma tarixida ("Click orqali to'landi") va
 * savatdagi tanlash tugmalarida BIR XIL nom ishlatiladi. Ilgari
 * ikkalasi alohida, mos kelmasligi mumkin bo'lgan lug'at edi.
 * Paynet qo'shilganda faqat SHU YERGA bitta qator qo'shiladi.
 */
const PROVIDER_LABEL = { payme: 'Payme', click: 'Click', paynet: 'Paynet' };

/*
 * To'lov sahifasini ochish — ZAXIRA YO'L BILAN.
 *
 * MUAMMO (real qurilmada aniqlangan): "Ha, yuborish" bosilganda
 * buyurtma YARATILARDI va to'lov havolasi OLINARDI (server xatosi
 * yo'q — hech qanday ogohlantirish chiqmasdi), lekin Click sahifasi
 * OCHILMASDI. Tugma shunchaki oddiy holatiga qaytardi.
 *
 * SABAB: tg.openLink() foydalanuvchi bosishidan KEYIN, `await`
 * tugagach chaqiriladi — ya'ni brauzer nuqtai nazaridan bu endi
 * "foydalanuvchi harakati" (user gesture) doirasida emas. iOS
 * WKWebView bunday chaqiruvlarni jimgina bloklaydi: xato ham
 * bermaydi, hodisa ham yubormaydi.
 *
 * YECHIM: openLink chaqiriladi, so'ng 1 soniya kutiladi. Agar
 * ilova hamon ko'rinib tursa (ya'ni hech qayerga o'tilmagan),
 * o'sha oynaning o'zini to'lov manziliga yo'naltiramiz —
 * location.href user gesture talab qilmaydi, u har doim ishlaydi.
 *
 * Savat yo'qolmaydi: u localStorage'da saqlanadi va orderId
 * savePendingPayment() orqali yozib qo'yilgan, shuning uchun
 * Click'dan qaytgach holat avtomatik tekshiriladi.
 */
function openPaymentUrl(url) {
  const tg = getTelegram();

  /*
   * Muvaffaqiyat = sahifa ko'rinmay qoldi (mijoz boshqa oynaga
   * o'tdi). Buni visibilitychange orqali aniqlaymiz.
   */
  let left = false;
  const onHide = () => { if (document.visibilityState === 'hidden') left = true; };
  document.addEventListener('visibilitychange', onHide);

  const stillHere = () => !left && document.visibilityState === 'visible';

  // 1-USUL: Telegram ichki brauzeri. ENG YAXSHISI — o'z
  // yopish/orqaga tugmasi bor, Mini App orqa fonda saqlanadi.
  try { tg?.openLink?.(url); } catch { /* pastdagi usullar ishlaydi */ }

  setTimeout(() => {
    if (!stillHere()) { document.removeEventListener('visibilitychange', onHide); return; }

    /*
     * 2-USUL: yangi oyna. openLink ishlamadi (iOS WKWebView
     * user gesture'dan tashqaridagi chaqiruvni jimgina
     * bloklaydi). window.open Mini App'ni JOYIDA qoldiradi,
     * shuning uchun mijoz Click'dan qaytganda savati va
     * sahifasi saqlanib turadi.
     */
    let opened = null;
    try { opened = window.open(url, '_blank'); } catch { /* bloklangan */ }

    setTimeout(() => {
      document.removeEventListener('visibilitychange', onHide);
      if (!stillHere() || opened) return;

      /*
       * 3-USUL — ENG OXIRGI CHORA: oynaning o'zini yo'naltirish.
       *
       * KAMCHILIGI: Mini App Click sahifasi bilan ALMASHADI va
       * mijozda "orqaga" tugmasi qolmaydi — u faqat butun
       * ilovani yopishi mumkin. Aynan shu holat kuzatilgan edi.
       *
       * Shuning uchun bu faqat birinchi ikki usul ishlamagandagina
       * qo'llanadi. Qaytish esa Click tomonidagi return_url
       * orqali ta'minlanadi (server: CLICK_RETURN_URL), u mijozni
       * lokma.uz ga qaytaradi va kutilayotgan to'lov yozuvi
       * (localStorage) tufayli savat joyida turadi.
       */
      window.location.href = url;
    }, 400);
  }, 900);
}



export function CartPage() {
  const navigate = useNavigate();
  const t = useT();
  // Selectorlar alohida — useCart() to'liq obyekt qaytaradi va
  // har store o'zgarishida qayta render bo'ladi.
  const items = useCart((s) => s.items);
  const addItem = useCart((s) => s.addItem);
  const decrement = useCart((s) => s.decrement);
  const removeItem = useCart((s) => s.removeItem);
  // Buyurtma tasdiqlash modali — REACT HOOKLAR QOIDASI: bu yerda,
  // pastdagi "savat bo'sh" erta return'idan OLDIN e'lon qilinishi
  // SHART. Avval pastda edi — buyurtma yuborilgach savat
  // tozalanib (items.length===0 bo'lib) komponent erta return'ga
  // tushardi, lekin bu hook oldingi renderda chaqirilgan edi —
  // "Rendered fewer hooks than expected" xatosi shu tufayli
  // chiqardi. Endi barcha shart-sharoitlarda bir xil sonda
  // hook chaqiriladi.
  const [showConfirm, setShowConfirm] = useState(false);
  const totalPrice = useCart((s) => s.totalPrice);
  const totalCount = useCart((s) => s.totalCount);
  const restaurantGroups = useCart((s) => s.restaurantGroups);
  const itemCount = totalCount();
  const user = useUser((s) => s.user);
  const updateUser = useUser((s) => s.updateUser);
  const addAddress = useUser((s) => s.addAddress);
  const setDefaultAddress = useUser((s) => s.setDefaultAddress);
  const lastPaymentMethod = useUser((s) => s.lastPaymentMethod);
  const setLastPaymentMethod = useUser((s) => s.setLastPaymentMethod);
  const placeOrder = useOrders((s) => s.placeOrder);

  // Yetkazish narxi — masofaga qarab serverda hisoblanadi
  const [quotes, setQuotes] = useState({});
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Yopilgan restoran taomlari savatdan avtomatik chiqadi
  const [removedNote, setRemovedNote] = useState(null);

  useCartCleanup((name) => {
    setRemovedNote(`${name} yopilgani uchun taomlari savatdan olib tashlandi`);
    setTimeout(() => setRemovedNote(null), 6000);
  });

  // Manzil yoki savat o'zgarganda yetkazish narxi qayta so'raladi.
  // Effekt selectedAddress e'lon qilingandan KEYIN turadi —
  // pastga qarang. (Bog'liqlik massivi render paytida
  // hisoblanadi, shuning uchun tartib muhim.)

  // Sahifa ochilganda tepadan boshlanadi.
  // Aks holda oldingi sahifadagi scroll holati saqlanib qoladi.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    // Ichki scroll konteyner bo'lsa uni ham
    document.querySelector('.cart-scroll')?.scrollTo({ top: 0 });
  }, []);

  /*
   * ═══ KUTILAYOTGAN TO'LOVNI TEKSHIRISH ═══
   *
   * null        — kutilayotgan to'lov yo'q, savat oddiy holatda
   * 'checking'  — serverdan javob kutilmoqda
   * { unpaid }  — tekshirildi, HALI TO'LANMAGAN (mijoz Click'dan
   *               to'lamasdan qaytgan bo'lishi mumkin)
   *
   * Tekshirish IKKI holatda ishga tushadi: sahifa ochilganda
   * (mount) VA mijoz Telegram WebApp'ga qaytganda
   * (visibilitychange/focus) — aynan Click'dan qaytgan payt shu.
   */
  const [pendingCheck, setPendingCheck] = useState(null);

  useEffect(() => {
    let cancelled = false;

    /*
     * BARCHA kutilayotgan to'lovlar tekshiriladi, bittasi emas.
     *
     * Mijoz to'lovni boshlab, to'lamasdan qaytib, yana boshlashi
     * mumkin — o'shanda ikkita 'awaiting_payment' buyurtma bo'ladi.
     * Ilgari faqat oxirgisi saqlanardi va birinchisi "ko'rinmas"
     * bo'lib qolardi: mijoz o'sha eski havola orqali to'lasa,
     * ilova buni sezmasdi va savat tozalanmasdi.
     *
     * Endi: agar ULARDAN BIRORTASI to'langan bo'lsa, savat
     * tozalanadi va kuzatuv sahifasiga o'tiladi.
     */
    async function check() {
      const pendings = getPendingPayments();
      if (!pendings.length) { if (!cancelled) setPendingCheck(null); return; }

      if (!cancelled) setPendingCheck('checking');
      try {
        const orders = await Promise.all(
          pendings.map((p) =>
            api.getOrder(p.orderId)
              .then((o) => ({ pending: p, order: o }))
              .catch(() => null)),
        );
        if (cancelled) return;

        const known = orders.filter(Boolean);
        if (!known.length) {
          // Hech biriga javob kelmadi — tarmoq muammosi.
          // Yozuvlar SAQLANADI, keyingi tekshiruvda qayta urinamiz.
          setPendingCheck(null);
          return;
        }

        // Bekor bo'lganlarni ro'yxatdan chiqaramiz
        known
          .filter(({ order }) => order.status === 'cancelled')
          .forEach(({ pending }) => clearPendingPayment(pending.orderId));

        const paid = known.find(({ order }) =>
          order.isPaid || (order.status !== 'awaiting_payment' && order.status !== 'cancelled'));

        if (paid) {
          /*
           * PUL YECHILDI — endi va FAQAT endi savat tozalanadi
           * va buyurtma faol qilinadi. loadActive() serverdan
           * HAQIQIY holatni oladi (Order.status), ya'ni
           * "Qabul qilindi" endi rost gap — restoran buyurtmani
           * chindan ham ko'rmoqda.
           *
           * Qolgan to'lanmagan yozuvlar ham tozalanadi: savat
           * allaqachon bo'shagani uchun ular endi ma'nosiz.
           */
          clearPendingPayment();
          useCart.getState().clear();
          await useOrders.getState().loadActive();
          if (!cancelled) {
            setPendingCheck(null);
            navigate('/order/track');
          }
          return;
        }

        // Hali hech biri to'lanmagan — mijoz to'lamagan yoki
        // Click sahifasini yopib yuborgan. Savat TEGILMAYDI.
        const waiting = known.find(({ order }) => order.status === 'awaiting_payment');
        setPendingCheck(waiting
          ? { unpaid: true, orderId: waiting.pending.orderId, provider: waiting.pending.provider }
          : null);
      } catch {
        // Kutilmagan xato — keyingi tekshiruvda qayta urinamiz,
        // hozircha jim turamiz (savat baribir tegilmagan).
        if (!cancelled) setPendingCheck(null);
      }
    }

    check();

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', check);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', check);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Eski to'lanmagan buyurtma uchun havolani qayta ochish. */
  const retryPendingPayment = async () => {
    if (!pendingCheck?.orderId) return;
    haptic();
    try {
      /*
       * Provayder AYNAN to'lov boshlangandagisi bo'lishi shart.
       * Ilgari bu yerda lastPaymentMethod ishlatilardi — mijoz
       * shu orada "Naqd" ga o'tgan bo'lsa, server provider=cash
       * uchun 400 qaytarardi.
       */
      const provider = pendingCheck.provider || lastPaymentMethod;
      const { url } = await api.getPaymentLink(pendingCheck.orderId, provider);
      openPaymentUrl(url);
    } catch (e) {
      alert(e.message || 'To‘lov havolasini olib bo‘lmadi');
    }
  };

  /*
   * Eski to'lovdan voz kechish — savat allaqachon saqlangan,
   * mijoz darhol yangi buyurtma bera oladi. Serverdagi eski
   * 'awaiting_payment' yozuv shunchaki "osilib" qoladi — hech
   * qachon hech kimga ko'rinmaydi va hech qanday pul harakati
   * bo'lmagani uchun zarari yo'q.
   */
  const dismissPendingPayment = () => {
    haptic();
    clearPendingPayment(pendingCheck?.orderId);
    setPendingCheck(null);
  };

  // Guruhlar memolanadi — restaurantGroups() har chaqirilganda
  // YANGI massiv qaytaradi, memosiz pastdagi useMemo'lar
  // cheksiz qayta hisoblanardi.
  const groups = useMemo(() => restaurantGroups(), [items, restaurantGroups]);

  /*
   * Yetkazish xizmati mavjudmi — serverdan JONLI tekshiriladi.
   *
   * Savatdagi `dish` obyektida bu ma'lumot bo'lmasligi mumkin
   * (eski localStorage yozuvi), shuning uchun restoranlar
   * ro'yxatidan olamiz. Savatdagi restoranlardan HECH BO'LMASA
   * BITTASIDA yetkazish o'chirilgan bo'lsa — butun buyurtmani
   * yetkazib bo'lmaydi (bitta kuryer hammasini olib keladi).
   */
  const { data: allRestaurants = [] } = useRestaurants();
  const deliveryOff = useMemo(() => {
    if (!allRestaurants.length) return null;   // hali yuklanmagan — cheklamaymiz
    const blocked = groups
      .map((g) => allRestaurants.find((r) => String(r.id || r._id) === String(g.restaurant.id)))
      .filter((r) => r && r.deliveryEnabled === false);
    return blocked.length ? blocked : null;
  }, [groups, allRestaurants]);

  const [paying, setPaying] = useState(false);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [showAddressFlow, setShowAddressFlow] = useState(false);

  // Yetkazish turi va vaqt
  const [fulfillment, setFulfillment] = useState('delivery'); // 'delivery' | 'pickup'
  const [timingMode, setTimingMode] = useState('asap');       // 'asap' | 'scheduled'
  const [scheduledFor, setScheduledFor] = useState(null);
  const isPickup = fulfillment === 'pickup';

  /*
   * Yetkazish o'chirilgan bo'lsa — avtomatik "O'zim olib
   * ketaman"ga o'tkazamiz. Foydalanuvchi tanlab qo'ygan bo'lsa
   * ham: aks holda tugma bosib bo'lmaydigan holatda qolib,
   * "nega buyurtma bermayapti" degan chalkashlik bo'lardi.
   */
  useEffect(() => {
    if (deliveryOff && fulfillment === 'delivery') {
      setFulfillment('pickup');
    }
  }, [deliveryOff, fulfillment]);
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(user.phone ?? '');
  const [paymentMethod, setPaymentMethod] = useState(lastPaymentMethod);
  // To'lov kartalari — server'dan yuklanadi
  const [cards, setCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);

  /*
   * ═══ TO'LOV PROVAYDERLARI — DINAMIK RO'YXAT ═══
   *
   * ILGARI: faqat {payme, click} — ikkita nom KODGA QATTIQ
   * YOZILGAN edi. Paynet qo'shilganda bu yerni ham, pastdagi
   * tanlash tugmalarini ham qo'lda o'zgartirish kerak bo'lardi.
   *
   * ENDI: server /payments/status.available orqali QANDAY
   * provayder ulangan bo'lsa, o'shani qaytaradi — registry
   * pattern (server: services/providers/index.js). Yangi
   * shlyuz (Paynet, keyinroq boshqasi) qo'shilsa, u FAQAT
   * serverda konfiguratsiya qilinishi bilan mijozga avtomatik
   * chiqadi — bu faylni o'zgartirish shart emas.
   */
  const [providers, setProviders] = useState([]);
  const onlineAvailable = providers.length > 0;

  // Karta tanlanganda: birinchi mavjud provayder tanlanadi.
  // Faqat BITTA provayder bo'lsa mijoz ortiqcha tanlov
  // ko'rmaydi — to'g'ridan-to'g'ri o'shanga o'tadi.
  const pickCardProvider = () => {
    haptic();
    if (providers.length > 0) setPaymentMethod(providers[0].name);
  };

  // Naqdmi yoki karta orqalimi
  const isCard = providers.some((p) => p.name === paymentMethod);

  /*
   * ILGARI xato jimgina yutilardi (.catch(() => {})). Natijada
   * so'rov yiqilsa `providers` bo'sh qolib, "Karta orqali"
   * tugmasi UMUMAN KO'RINMASDI — mijoz karta bilan to'lay
   * olmasdi va sababini ham bilmasdi.
   *
   * Endi bir marta qayta urinamiz (tarmoq uzilishi ko'pincha
   * bir martalik), keyin ham bo'lmasa holatni belgilab qo'yamiz —
   * mijozga "to'lov tizimiga ulanib bo'lmadi" deb ko'rsatiladi.
   */
  const [providersFailed, setProvidersFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = (retry = true) => api.getPaymentStatus()
      .then((st) => {
        if (cancelled) return;
        setProviders(Array.isArray(st?.available) ? st.available : []);
        setProvidersFailed(false);
      })
      .catch(() => {
        if (cancelled) return;
        if (retry) { setTimeout(() => load(false), 2000); return; }
        setProvidersFailed(true);
      });

    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    api.getCards()
      .then((list) => {
        const arr = Array.isArray(list) ? list : [];
        setCards(arr);
        setSelectedCard(arr.find((c) => c.isDefault) || arr[0] || null);
      })
      .catch(() => {});
  }, []);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [useBonus, setUseBonus] = useState(false);

  // Referal bonus balansini olamiz
  useEffect(() => {
    api.getReferralInfo().then((r) => setBonusBalance(r.bonusBalance || 0)).catch(() => {});
  }, []);

  /*
   * ═══ RESTORAN SHARTLARINI YANGILAB OLAMIZ ═══
   *
   * MUAMMO: savat restoran ma'lumotini taom qo'shilgan
   * paytdagi NUSXADAN oladi (cart store'dagi meta) va uni
   * hech qachon yangilamaydi. Bundan ikki xil xato chiqadi:
   *
   *   1) Savatda eski taom yotgan bo'lsa va o'shandan beri
   *      yangi maydon qo'shilgan bo'lsa (masalan olib ketish
   *      chegirmasi) — u nusxada YO'Q va hisobga kirmaydi.
   *      Mijoz uchun bu "chegirma ishlamayapti" bo'lib ko'rinadi.
   *
   *   2) Restoran shartni o'zgartirsa (chegirma, yetkazish
   *      haqi, minimal summa) savatdagi eski qiymat qoladi va
   *      mijoz ko'rgan summa server hisoblaganidan farq qiladi.
   *
   * Server baribir hammasini QAYTA hisoblaydi va u haqiqat
   * manbai. Shuning uchun mijozga ham aynan o'sha shartlarni
   * ko'rsatishimiz kerak.
   */
  const [freshRest, setFreshRest] = useState({});

  useEffect(() => {
    const ids = [...new Set(groups.map((g) => g.restaurant.id))];
    if (ids.length === 0) return;

    let alive = true;
    Promise.all(
      ids.map((id) => api.getRestaurant(id).catch(() => null)),
    ).then((list) => {
      if (!alive) return;
      const map = {};
      list.forEach((r) => { if (r?._id) map[String(r._id)] = r; });
      setFreshRest(map);
    });

    return () => { alive = false; };
    // Restoranlar to'plami o'zgargandagina qayta so'raymiz —
    // taom sonini o'zgartirish so'rov yubormasin
  }, [groups.map((g) => g.restaurant.id).sort().join(',')]);

  // ===== HISOB-KITOB =====
  // Har restoran uchun alohida: yetkazish, xizmat haqi, minimal summa.
  // Mantiq serverdagi bilan bir xil (lib/pricing.js ↔ orderPricing.js)
  const pricing = useMemo(() => {
    const perRestaurant = groups.map((g) => {
      const sub = g.subtotal ?? g.items.reduce((s, it) => s + it.unitPrice * it.quantity, 0);

      /*
       * Jonli ma'lumot USTUN, nusxa esa zaxira: so'rov hali
       * kelmagan yoki tarmoq yiqilgan bo'lsa ham savat
       * ishlayveradi, faqat eski shartlar bilan.
       */
      const live = freshRest[g.restaurant.id];
      const rest = live ? { ...g.restaurant, ...live } : g.restaurant;
      return {
        restaurant: rest,
        subtotal: sub,
        // Server hisobi bo'lsa u ustun — masofaga qarab
        deliveryFee: quotes[rest.id]?.deliveryAvailable
          ? quotes[rest.id].deliveryPrice
          : calcDeliveryFee(sub, rest, isPickup),
        quote: quotes[rest.id] || null,
        serviceFee: calcServiceFee(sub, rest),
        pickupDiscount: calcPickupDiscount(sub, rest, isPickup),
        minCheck: checkMinOrder(sub, rest, isPickup),
        freeGap: freeDeliveryGap(sub, rest, isPickup),
      };
    });

    const subtotal = perRestaurant.reduce((s, r) => s + r.subtotal, 0);
    const deliveryFee = perRestaurant.reduce((s, r) => s + r.deliveryFee, 0);
    const serviceFee = perRestaurant.reduce((s, r) => s + r.serviceFee, 0);
    const pickupDiscount = perRestaurant.reduce((s, r) => s + r.pickupDiscount, 0);

    // Minimal summaga yetmagan restoranlar
    const blocked = perRestaurant.filter((r) => !r.minCheck.ok);

    // Yopiq restoranlar. Belgilangan vaqtga buyurtmada
    // tekshirilmaydi — mijoz ochilish vaqtiga rejalashtiradi.
    const closed = timingMode === 'scheduled'
      ? []
      : perRestaurant.filter((r) => !isOpenNow(r.restaurant));

    // Yetkazish radiusidan tashqarida qolganlar.
    // Server quote'ida deliveryAvailable=false bo'lsa — shu manzilga
    // yetkazib bo'lmaydi. Olib ketishda tekshirilmaydi.
    const outOfRange = isPickup
      ? []
      : perRestaurant.filter((r) => r.quote && r.quote.deliveryAvailable === false);

    return {
      perRestaurant,
      subtotal,
      deliveryFee,
      serviceFee,
      pickupDiscount,
      orderSum: subtotal + deliveryFee + serviceFee - pickupDiscount,
      blocked,
      closed,
      outOfRange,
      canOrder: blocked.length === 0 && closed.length === 0
        && outOfRange.length === 0,
    };
  }, [groups, isPickup, timingMode, quotes, freshRest]);

  // Bepul yetkazishgacha qolgan eng kichik summa
  const gapToFree = useMemo(() => {
    const gaps = pricing.perRestaurant
      .map((r) => r.freeGap)
      .filter((g) => g !== null && g > 0);
    return gaps.length ? Math.min(...gaps) : 0;
  }, [pricing]);

  const effectiveDeliveryFee = pricing.deliveryFee;
  const orderSum = pricing.orderSum;

  // Tayyorlash/yetkazish vaqtini hisoblaymiz
  const prepMinutes = groups.length
    ? Math.max(...groups.map((g) => g.restaurant.prepMinutes ?? 20))
    : 20;
  const deliveryMinutes = groups.length
    ? Math.max(...groups.map((g) => g.restaurant.deliveryMax ?? 40))
    : 40;

  const fmtClock = (d) => d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit', hour12: false });
  const readyTimeLabel = fmtClock(new Date(Date.now() + prepMinutes * 60_000));
  const etaLabel = fmtClock(new Date(Date.now() + deliveryMinutes * 60_000));

  // Belgilangan vaqt uchun slotlar (30 daqiqalik oraliq, 8 soatgacha)
  const timeSlots = useMemo(() => {
    const slots = [];
    const start = new Date(Date.now() + (isPickup ? prepMinutes : deliveryMinutes) * 60_000);
    // Keyingi yarim soatlikka yaxlitlaymiz
    start.setMinutes(start.getMinutes() > 30 ? 60 : 30, 0, 0);
    for (let i = 0; i < 16; i++) {
      const d = new Date(start.getTime() + i * 30 * 60_000);
      slots.push({ value: d.toISOString(), label: fmtClock(d) });
    }
    return slots;
  }, [isPickup, prepMinutes, deliveryMinutes]);
  // Yetkazish vaqti (barcha restoranlar ичida eng kengi)
  const etaText = (() => {
    if (groups.length === 0) return '';
    const min = Math.min(...groups.map((g) => g.restaurant.deliveryMin ?? 25));
    const max = Math.max(...groups.map((g) => g.restaurant.deliveryMax ?? 40));
    return `${min}–${max} daq`;
  })();

  // Savatni tozalash (tasdiq bilan)
  const confirmClear = () => {
    haptic();
    if (window.confirm(t('clearCartConfirm'))) {
      useCart.getState().clear();
    }
  };

  // Ishlatiladigan bonus: balansдан va summадан oshмаsин
  const bonusApplied = useBonus ? Math.min(bonusBalance, orderSum) : 0;
  const total = orderSum - bonusApplied;
  const selectedAddress = user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0];

  // Manzil yoki savat o'zgarganda yetkazish narxi serverdan
  // qayta so'raladi (masofaga qarab hisoblanadi).
  useEffect(() => {
    if (isPickup || !selectedAddress?.lat || !selectedAddress?.lng) {
      setQuotes({});
      return;
    }

    const ids = groups.map((g) => g.restaurant.id).filter(Boolean);
    if (!ids.length) return;

    let cancelled = false;
    setQuoteLoading(true);
    Promise.all(
      ids.map((id) =>
        api.getDeliveryQuote(id, selectedAddress.lat, selectedAddress.lng)
          .then((q) => [id, q])
          .catch(() => [id, null]),
      ),
    )
      .then((pairs) => {
        if (cancelled) return;
        setQuotes(Object.fromEntries(pairs.filter(([, q]) => q)));
      })
      .finally(() => { if (!cancelled) setQuoteLoading(false); });

    // Manzil tez o'zgarsa eski javob yangisini bosib ketmasin
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAddress?.lat, selectedAddress?.lng, isPickup, groups.length]);

  if (items.length === 0) {
    return (
      <div className="app-shell cart-empty">
        <Icon name="bag" size={48} color="var(--muted)" />
        <div className="cart-empty__title">{t('cartEmpty')}</div>
        <p className="cart-empty__hint">{t('cartEmptyHint')}</p>
        <button onClick={() => navigate('/')} className="btn-primary">{t('allRestaurants')}</button>
        {/*
          Savat bo'sh bo'lsa ham (masalan mijoz qo'lda
          tozalagan), eski to'lanmagan buyurtma bo'lishi mumkin —
          bu ma'lumot yo'qolib ketmasligi kerak.
        */}
        {pendingCheck?.unpaid && (
          <PendingPaymentNotice
            onRetry={retryPendingPayment}
            onDismiss={dismissPendingPayment}
          />
        )}
      </div>
    );
  }

  function handlePlaceOrder() {
    // Manzil faqat yetkazishda majburiy
    if (!isPickup && !selectedAddress) { setShowAddressSheet(true); return; }
    if (!user.phone) { setPhoneDraft(''); setShowPhoneEdit(true); return; }
    // Belgilangan vaqt tanlanmagan bo'lsa — birinchi slotni olamiz
    if (timingMode === 'scheduled' && !scheduledFor && timeSlots.length) {
      setScheduledFor(timeSlots[0].value);
    }
    /*
     * Bu yerda ENDI to'g'ridan-to'g'ri yubormaymiz — avval
     * SO'NGGI TEKSHIRUV modali ochiladi (OrderConfirmModal).
     * Haqiqiy yuborish confirmAndSubmit() da, mijoz "Ha,
     * yuborish" bosgandan keyin bo'ladi.
     */
    setShowConfirm(true);
  }

  /*
   * ═══ TAKRORIY YUBORISHDAN QULF ═══
   * React holati darhol yangilanmaydi — tez ikki marta bosilsa
   * `paying` hali false bo'lib turib, ikkita buyurtma
   * yaratilishi mumkin edi. ref sinxron o'zgaradi, shuning
   * uchun ikkinchi bosish shu yerda to'xtaydi.
   */
  const submitLock = useRef(false);

  function confirmAndSubmit() {
    if (submitLock.current) return;
    submitLock.current = true;

    /*
     * MODAL ENDI DARHOL YOPILMAYDI.
     *
     * ILGARI: setShowConfirm(false) birinchi qator edi. Modal
     * ko'zdan yo'qolardi, uning `submitting` holati esa hech
     * qachon ko'rinmasdi. Mijoz uchun manzara shunday edi:
     * "Ha, yuborish" bosdim -> oyna yopildi -> bir necha soniya
     * HECH NARSA -> keyin birdan Click sahifasi. "Bosildimi
     * yoki yo'qmi?" degan shubha aynan shundan edi.
     *
     * ENDI: modal ochiq qoladi, tugma "Yuborilmoqda..." ga
     * o'tadi va bloklanadi. Mijoz jarayonni ko'rib turadi.
     * Modal faqat natija ma'lum bo'lgandan keyin yopiladi.
     */
    setPaying(true);
    setLastPaymentMethod(paymentMethod);
    const addrLabel = isPickup
      ? ''
      : `${selectedAddress.title} — ${selectedAddress.address}`;
    const paymentLabel = paymentMethod === 'cash'
      ? t('cash')
      : (PROVIDER_LABEL[paymentMethod] || t('cash'));
    // Backendga yuboradi (async). Xato bo'lsa ham local rejim ishlaydi.
    placeOrder(groups, total, addrLabel, paymentLabel, paymentMethod, user.phone, bonusApplied, {
      fulfillment,
      timingMode,
      scheduledFor: timingMode === 'scheduled' ? (scheduledFor || timeSlots[0]?.value) : undefined,
      // Karta to'lovi bo'lsa qaysi karta ekanini saqlaymiz
      ...(paymentMethod !== 'cash' && selectedCard
        ? { cardLast4: selectedCard.last4, cardBrand: selectedCard.brand }
        : {}),
      // Yetkazish nuqtasi — kuryer xaritada ko'radi
      ...(!isPickup && selectedAddress?.lat && selectedAddress?.lng
        ? {
            addressLat: Number(selectedAddress.lat),
            addressLng: Number(selectedAddress.lng),
          }
        : {}),
      // Podez, qavat, xonadon
      ...(!isPickup && selectedAddress
        ? {
            addressNote: [
              selectedAddress.entrance && `${selectedAddress.entrance}-kirish`,
              selectedAddress.floor && `${selectedAddress.floor}-qavat`,
              selectedAddress.flat && `xon. ${selectedAddress.flat}`,
              selectedAddress.note,
            ].filter(Boolean).join(', '),
          }
        : {}),
    })
      .then(async (created) => {
        // NAQD — buyurtma darhol restoranga boradi
        if (paymentMethod === 'cash') {
          useCart.getState().clear();
          setPaying(false);
          setShowConfirm(false);
          submitLock.current = false;
          navigate('/orders');
          return;
        }

        /*
         * KARTA — buyurtma "to'lov kutilmoqda" holatida
         * yaratildi, restoranga hali KO'RINMAYDI.
         *
         * ═══ SAVAT ENDI DARHOL TOZALANMAYDI ═══
         *
         * ILGARI: Click havolasi olinishi bilanoq savat
         * tozalanardi va mijoz "Buyurtmalar" sahifasiga
         * yo'naltirilardi — pul hali yechilmagan bo'lsa ham!
         * Mijoz Click'dan to'lamasdan orqaga qaytsa: savati
         * yo'q, buyurtma "qabul qilindi" bo'lib ko'rinardi
         * (store/orders.js dagi eski xato bilan birga), holbuki
         * na pul yechilgan, na buyurtma restoranga chiqqan edi.
         *
         * ENDI: savat SAQLANADI. orderId localStorage'ga
         * yoziladi (lib/pendingPayment.js). Mijoz Click'dan
         * qaytganda, CartPage qayta ochilganda serverdan
         * HAQIQIY holat so'raladi (pastdagi useEffect) — faqat
         * isPaid:true bo'lsagina savat tozalanadi va buyurtma
         * faol qilinadi.
         */
        const orderId = created?.orderId;

        if (!orderId) {
          // Buyurtma ID kelmadi — to'lovni boshlab bo'lmaydi.
          // Savat saqlanadi, mijoz qayta urinishi mumkin.
          setPaying(false);
          setShowConfirm(false);
          submitLock.current = false;
          alert(t('orderCreatedPaymentFailed'));
          return;
        }

        try {
          const { url } = await api.getPaymentLink(orderId, paymentMethod);

          savePendingPayment(orderId, paymentMethod);

          /*
           * Tartib MUHIM: avval havola ochiladi, keyin holat
           * tozalanadi. Aks holda tugma bir lahzaga oddiy
           * holatiga qaytib, "hech narsa bo'lmadi" taassuroti
           * berardi.
           */
          openPaymentUrl(url);
          setPaying(false);
          setShowConfirm(false);
          submitLock.current = false;

          /*
           * NAVIGATE QILINMAYDI. Mijoz CartPage'da qoladi —
           * Telegram `openLink` WebApp'ni yopmaydi, orqa fonda
           * ochiq turadi. Click'dan "orqaga" qaytganda mijoz
           * xuddi shu sahifani, xuddi shu savatni ko'radi.
           * Sahifa pastdagi useEffect orqali to'lov holatini
           * o'zi kuzatib boshlaydi (pollingCheck).
           */
        } catch (e) {
          // To'lov havolasi olinmadi — savat SAQLANADI.
          // Buyurtma 'awaiting_payment' holatida qoladi va
          // restoranga ko'rinmaydi. Mijoz qayta urinishi mumkin.
          setPaying(false);
          setShowConfirm(false);
          submitLock.current = false;
          alert(
            (e.message && e.message !== 'STALE_CART_ID' ? e.message : t('paymentConnectionFailed'))
            + '\n\n' + t('cartSavedRetryOrCash'),
          );
        }
      })
      .catch((e) => {
        // Buyurtma YARATILMADI — savat saqlanadi, mijoz
        // taomlarini yo'qotmaydi va qayta urinishi mumkin.
        setPaying(false);
        setShowConfirm(false);
        submitLock.current = false;
        alert(
          (e?.message === 'STALE_CART_ID' ? t('staleCartError') : (e?.message || t('orderNotSent')))
          + '\n\n' + t('cartSavedRetry'),
        );
      });
  }

  function savePhone() {
    updateUser({ phone: phoneDraft });
    setShowPhoneEdit(false);
  }

  return (
    <div className="app-shell cart">
      <header className="cart-header">
        <button onClick={() => navigate(-1)} aria-label={t('back')} className="cart-header__btn">
          <Icon name="arrowLeft" size={21} color="var(--ink)" />
        </button> 

        {/* Sarlavha o'rniga foydali ma'lumot: vaqt va muassasa */}
        <div className="cart-header__center">
          {groups.length > 0 && (
            <div className="cart-header__sub">
              {etaText} · {groups.length === 1
                ? groups[0].restaurant.name
                : `${groups.length} ${t('establishmentsCount')}`}
            </div>
          )}
        </div>

        <button onClick={confirmClear} aria-label={t('clearCart')} className="cart-header__btn">
          <Icon name="trash" size={19} color="var(--muted)" />
        </button>
      </header>

      {/*
        Eski to'lanmagan buyurtma — mijoz Click'dan to'lamasdan
        qaytgan bo'lishi mumkin. Savat SAQLANGAN (endi darhol
        tozalanmaydi), lekin mijoz nima bo'lganini bilishi kerak:
        yo eski to'lovni davom ettiradi, yo undan voz kechib
        yangisini beradi.
      */}
      {pendingCheck?.unpaid && (
        <PendingPaymentNotice
          onRetry={retryPendingPayment}
          onDismiss={dismissPendingPayment}
        />
      )}

      {removedNote && (
        <div className="cart-removed">
          <Icon name="info" size={15} color="var(--info)" />
          <span>{removedNote}</span>
        </div>
      )}

      {groups.length > 1 && (
        <div className="cart-multi-hint">
          <Icon name="bag" size={18} color="var(--brand)" />
          <div>{groups.length} ta restoran · har biri alohida yetkaziladi.</div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.restaurant.id} className="cart-group">
          <div className="cart-group__head">
            <div className="cart-group__icon" style={{ background: group.restaurant.tint }}>
              <Icon name={group.restaurant.icon} size={13} color="var(--brand)" />
            </div>
            <div className="cart-group__name">{group.restaurant.name}</div>
            <div className="cart-group__time">
              <Icon name="clock" size={12} color="var(--muted)" /> {group.restaurant.deliveryMin}–{group.restaurant.deliveryMax} {t('min')}
            </div>
          </div>
          <div className="cart-items">
            {group.items.map((item) => (
              <div key={item.key} className="cart-item">
                <div className="cart-item__photo">
                  <DishPhoto dish={item.dish} height={56} radius={12} iconSize={26} />
                </div>
                <div className="cart-item__body">
                  <div className="cart-item__top">
                    <div className="cart-item__name">{item.dish.name}</div>
                    <button onClick={() => removeItem(item.key)} aria-label={t('close')}>
                      <Icon name="trash" size={16} color="var(--muted)" />
                    </button>
                  </div>
                  {item.selectedOptions.length > 0 && (
                    <div className="cart-item__opts">{item.selectedOptions.map((o) => o.name).join(', ')}</div>
                  )}
                  <div className="cart-item__bottom">
                    <div className="cart-item__price">{formatSom(item.unitPrice * item.quantity)}</div>
                    <div className="qty-control">
                      <button onClick={() => decrement(item.key)} className="qty-btn qty-btn--minus" aria-label="−">
                        <Icon name="minus" size={14} color="var(--muted)" />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button onClick={() => addItem(item.dish, 1, item.selectedOptions, item.note)} className="qty-btn qty-btn--plus" aria-label="+">
                        <Icon name="plus" size={14} color="var(--brand-text)" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Yetkazish turi — kuryer yoki o'zim olib ketaman */}
      <div className="cart-section-label">{t('howToReceive')}</div>
      <div className="cart-fulfillment">
        <button
          onClick={() => { if (deliveryOff) return; haptic(); setFulfillment('delivery'); }}
          disabled={!!deliveryOff}
          className={`cart-ftab ${fulfillment === 'delivery' ? 'is-active' : ''} ${deliveryOff ? 'is-disabled' : ''}`}
        >
          <Icon name="bike" size={19} color={fulfillment === 'delivery' ? 'var(--brand)' : 'var(--muted)'} />
          <span className="cart-ftab__title">{t('deliveryTabTitle')}</span>
          <span className="cart-ftab__sub">
            {deliveryOff
              ? t('notAvailable')
              : (pricing.deliveryFee === 0 ? t('free') : formatSom(pricing.deliveryFee))}
          </span>
        </button>
        <button
          onClick={() => { haptic(); setFulfillment('pickup'); }}
          className={`cart-ftab ${fulfillment === 'pickup' ? 'is-active' : ''}`}
        >
          <Icon name="bag" size={19} color={fulfillment === 'pickup' ? 'var(--brand)' : 'var(--muted)'} />
          <span className="cart-ftab__title">{t('pickupSelf')}</span>
        </button>
      </div>

      {/* Yetkazish mavjud emasligi haqida aniq ogohlantirish */}
      {deliveryOff && (
        <div className="cart-delivery-off">
          <Icon name="info" size={16} color="var(--appetite)" />
          <span>
            {deliveryOff.length === 1
              ? `${deliveryOff[0].name} ${t('restaurantNoDelivery')}`
              : t('someRestaurantsNoDelivery')}
            {' '}{t('canPickupInstead')}
          </span>
        </div>
      )}

      {/* Vaqt — hozir yoki belgilangan */}
      <div className="cart-section-label">{t('whenLabel')}</div>
      <div className="cart-timing">
        <div className="cart-timing__tabs">
          <button
            onClick={() => { haptic(); setTimingMode('asap'); }}
            className={`cart-ttab ${timingMode === 'asap' ? 'is-active' : ''}`}
          >
            {isPickup ? t('readyWhenDone') : t('asapLabel')}
          </button>
          <button
            onClick={() => { haptic(); setTimingMode('scheduled'); }}
            className={`cart-ttab ${timingMode === 'scheduled' ? 'is-active' : ''}`}
          >
            {t('scheduleLabel')}
          </button>
        </div>

        {timingMode === 'asap' ? (
          <div className="cart-timing__hint">
            <Icon name="clock" size={15} color="var(--success)" />
            <span>
              {isPickup
                ? t('readyAtApprox').replace('{time}', readyTimeLabel)
                : t('deliveredAtApprox').replace('{time}', etaLabel)}
            </span>
          </div>
        ) : (
          <div className="cart-slots no-scrollbar">
            {timeSlots.map((slot) => (
              <button
                key={slot.value}
                onClick={() => { haptic(); setScheduledFor(slot.value); }}
                className={`cart-slot ${scheduledFor === slot.value ? 'is-active' : ''}`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Manzil — faqat yetkazishda */}
      {!isPickup && (
      <button
        onClick={() => setShowAddressSheet(true)}
        className={`cart-field ${selectedAddress ? '' : 'cart-field--required'}`}
      >
        <Icon name="pin" size={22} color="var(--brand)" />
        <div className="cart-field__body">
          {selectedAddress ? (
            <>
              <div className="cart-field__value">{selectedAddress.title} · {selectedAddress.address}</div>
              <div className="cart-field__label">{t('deliveryAddress')}</div>
            </>
          ) : (
            <div className="cart-field__value cart-field__value--accent">{t('address')}</div>
          )}
        </div>
        <Icon name="chevronRight" size={18} color="var(--muted)" />
      </button>
      )}

      {/* Olib ketish manzili — restoran qayerdan olinadi */}
      {isPickup && groups.length > 0 && (
        <div className="cart-pickup-info">
          <Icon name="pin" size={20} color="var(--brand)" />
          <div className="cart-pickup-info__body">
            <div className="cart-pickup-info__title">{t('pickupAddressTitle')}</div>
            {groups.map((g) => (
              <div key={g.restaurant.id} className="cart-pickup-info__row">
                <b>{g.restaurant.name}</b>
                {g.restaurant.address && <span> — {g.restaurant.address}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Telefon */}
      <button
        onClick={() => { setPhoneDraft(user.phone || ''); setShowPhoneEdit(true); }}
        className={`cart-field ${user.phone ? '' : 'cart-field--required'}`}
      >
        <Icon name="phone" size={22} color={user.phone ? 'var(--success)' : 'var(--brand)'} />
        <div className="cart-field__body">
          <div className={`cart-field__value ${user.phone ? '' : 'cart-field__value--accent'}`}>
            {user.phone || '+998 __ ___ __ __'}
          </div>
          <div className="cart-field__label">{t('phoneLabel')}</div>
        </div>
        <Icon name="chevronRight" size={18} color="var(--muted)" />
      </button>

      {/* To'lov */}
      <div className="cart-section-label">{t('paymentLabel')}</div>
      <div className="cart-payment">
        <div className="cart-payment__options">
          <button
            onClick={() => { haptic(); setPaymentMethod('cash'); }}
            className={`pay-opt ${paymentMethod === 'cash' ? 'is-active' : ''}`}
          >
            <span className="pay-opt__emoji">💵</span>
            <span>{t('cash')}</span>
            {paymentMethod === 'cash' && <Icon name="circleCheck" size={15} color="var(--brand)" />}
          </button>

          <button
            onClick={pickCardProvider}
            disabled={!onlineAvailable}
            className={`pay-opt ${isCard ? 'is-active' : ''} ${
              !onlineAvailable ? 'is-disabled' : ''
            }`}
          >
            <span className="pay-opt__emoji">💳</span>
            <span>{t('byCard')}</span>
            {isCard && <Icon name="circleCheck" size={15} color="var(--success)" />}
          </button>
        </div>

        {/*
          Onlayn to'lov mavjud emasligini tushuntiramiz.

          IKKI XIL SABAB, IKKI XIL XABAR:
          • providersFailed — serverga ulanib bo'lmadi. Karta
            aslida ishlayotgan bo'lishi mumkin, shunchaki
            ro'yxatni ololmadik. Mijozga "ulanib bo'lmadi" deb
            aytish to'g'ri (ilgari bu holat "karta mavjud emas"
            deb ko'rsatilardi — chalg'ituvchi edi).
          • aks holda — hech qanday shlyuz ulanmagan, naqd qoladi.
        */}
        {!onlineAvailable && (
          <p className="cart-payment__note">
            {providersFailed ? t('paymentConnectionFailed') : t('cardPaymentUnavailable')}
          </p>
        )}

        {/*
          Qaysi tizim orqali — IKKITADAN KO'P provayder ulangan
          bo'lsagina ko'rsatiladi. Bitta bo'lsa tanlov ma'nosiz
          (u allaqachon avtomatik tanlangan, pickCardProvider),
          shuning uchun mijozga ortiqcha qadam ko'rsatilmaydi —
          xuddi kuchli e-commerce saytlarida bo'lgani kabi:
          tanlov faqat haqiqatan variant bo'lganda chiqadi.
        */}
        {isCard && providers.length > 1 && (
          <div className="cart-providers">
            {providers.map((p) => (
              <button
                key={p.name}
                onClick={() => { haptic(); setPaymentMethod(p.name); }}
                className={`cart-provider ${paymentMethod === p.name ? 'is-active' : ''}`}
              >
                {PROVIDER_LABEL[p.name] || p.name}
              </button>
            ))}
          </div>
        )}

        {/* Karta tanlash — faqat karta to'lovi tanlanganda */}
        {isCard && (
          <div className="cart-cards">
            {cards.length === 0 ? (
              <button onClick={() => navigate('/cards')} className="cart-cards__add">
                <Icon name="plus" size={16} color="var(--brand)" /> {t('addCard')}
              </button>
            ) : (
              <>
                {cards.map((c) => (
                  <button
                    key={c._id}
                    onClick={() => { haptic(); setSelectedCard(c); }}
                    className={`cart-card ${selectedCard?._id === c._id ? 'is-active' : ''}`}
                  >
                    <Icon name="card" size={16} color="var(--muted)" />
                    <span className="cart-card__num">
                      {c.bankName ? `${c.bankName} · ` : ''}•••• {c.last4}
                    </span>
                    {c.isDefault && <span className="cart-card__tag">{t('defaultBadge')}</span>}
                    {selectedCard?._id === c._id && (
                      <Icon name="circleCheck" size={15} color="var(--success)" />
                    )}
                  </button>
                ))}
                <button onClick={() => navigate('/cards')} className="cart-cards__manage">
                  {t('manageCards')}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Qo'shimcha tavsiya — "Hech narsani unutmadingizmi?" */}
      <CartUpsell groups={groups} />

      {/* Bonus bilan to'lash (referal bonusi bor bo'lsa) */}
      {bonusBalance > 0 && (
        <button onClick={() => setUseBonus((v) => !v)} className={`cart-bonus ${useBonus ? 'is-active' : ''}`}>
          <div className="cart-bonus__left">
            <Icon name="gift" size={20} color={useBonus ? 'var(--success)' : 'var(--brand)'} />
            <div>
              <div className="cart-bonus__title">{t('payWithBonus')}</div>
              <div className="cart-bonus__balance">{t('availableAmount')}: {formatSom(bonusBalance)}</div>
            </div>
          </div>
          <div className={`cart-bonus__toggle ${useBonus ? 'is-on' : ''}`}>
            <div className="cart-bonus__knob" />
          </div>
        </button>
      )}

      {/* Hisob */}
      <div className="cart-section-label">{t('accountLabel')}</div>
      <div className="cart-summary">
        <Row label={t('productsLabel')} value={formatSom(pricing.subtotal)} />
        {!isPickup && (
          <Row
            label={
              pricing.perRestaurant?.[0]?.quote?.distanceKm
                ? `${t('delivery')} · ${pricing.perRestaurant[0].quote.distanceKm} km`
                : t('delivery')
            }
            value={
              quoteLoading ? '...'
                : pricing.deliveryFee === 0 ? t('free')
                  : formatSom(pricing.deliveryFee)
            }
          />
        )}
        {pricing.serviceFee > 0 && (
          <Row label={t('serviceFee')} value={formatSom(pricing.serviceFee)} />
        )}
        {/* Olib ketish chegirmasi — mijoz nima uchun arzonlaganini
            ko'rishi kerak, aks holda summa tushunarsiz o'zgaradi */}
        {pricing.pickupDiscount > 0 && (
          <div className="cart-summary__row cart-summary__row--bonus">
            <span>{t('pickupDiscountLabel')}</span>
            <span>−{formatSom(pricing.pickupDiscount)}</span>
          </div>
        )}
        {bonusApplied > 0 && (
          <div className="cart-summary__row cart-summary__row--bonus">
            <span>{t('bonusDiscountLabel')}</span>
            <span>−{formatSom(bonusApplied)}</span>
          </div>
        )}
        <div className="cart-summary__total">
          <span>{t('total')}</span>
          <span>{formatSom(total)}</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div className="cart-footer">
        {/* Yetkazish qatori */}
        <div className="cart-footer__delivery">
          <Icon
            name="truck"
            size={18}
            color={pricing.deliveryFee === 0 ? 'var(--success)' : 'var(--muted)'}
          />
          <span className={pricing.deliveryFee === 0 ? 'is-free' : ''}>
            {isPickup
              ? t('youWillPickup')
              : pricing.deliveryFee === 0
                ? t('freeDelivery')
                : `${t('delivery')} · ${formatSom(pricing.deliveryFee)}`}
          </span>
          <span className="cart-footer__eta">{etaText}</span>
        </div>

        {/* Bepul yetkazishgacha qolgan summa */}
        {gapToFree > 0 && (
          <div className="cart-footer__gap">
            {t('gapToFreeText')} <b>{formatSom(gapToFree)}</b> {t('gapToFreeSuffix')}
          </div>
        )}

        {/* Yetkazish radiusidan tashqarida */}
        {pricing.outOfRange?.map((r) => (
          <div key={`range-${r.restaurant.id}`} className="cart-footer__warn cart-footer__warn--closed">
            <Icon name="info" size={14} color="var(--danger)" />
            <span>{r.quote.reason || `${r.restaurant.name} ${t('noDeliveryToAddress')}`}</span>
          </div>
        ))}

        {/* Yopiq restoranlar */}
        {pricing.closed.map((c) => {
          const r = c.restaurant;
          return (
            <div key={`closed-${r.id || r._id}`} className="cart-footer__warn cart-footer__warn--closed">
              <Icon name="clock" size={14} color="var(--danger)" />
              <span>
                <b>{r.name}</b> {t('restaurantClosedNow')}
                {r.openTime && ` · ${t('workingHoursRange')} ${r.openTime}–${r.closeTime}`}
              </span>
            </div>
          );
        })}

        {/* Minimal summaga yetmagan restoranlar */}
        {pricing.blocked.map((b) => (
          <div key={b.restaurant.id || b.restaurant._id} className="cart-footer__warn">
            <Icon name="info" size={14} color="var(--info)" />
            <span>
              <b>{b.restaurant.name}</b>: {t('addMoreProductsPrefix')}{' '}
              <b>{formatSom(b.minCheck.missing)}</b>{t('addMoreProductsSuffix')}
            </span>
          </div>
        ))}

        {/*
          To'lov tugmasi (soni + summa). Eski to'lanmagan
          buyurtma bo'lsa O'CHIRILADI — mijoz avval yuqoridagi
          eslatmadan uni hal qilishi kerak (davom ettirish yoki
          bekor qilish). Aks holda ikkita parallel buyurtma
          paydo bo'lishi mumkin edi.
        */}
        <button
          onClick={handlePlaceOrder}
          className={`cart-paybtn${paying ? ' is-loading' : ''}`}
          disabled={paying || !pricing.canOrder || pendingCheck?.unpaid}
        >
          <span className="cart-paybtn__count">{itemCount}</span>
          <span className="cart-paybtn__label">{paying ? t('loading') : t('payTotal')}</span>
          <span className="cart-paybtn__sum">{formatSom(total)}</span>
        </button>
      </div>

      {showAddressSheet && (
        <AddressSheet
          addresses={user.addresses}
          selectedId={selectedAddress?.id}
          onSelect={(id) => { setDefaultAddress(id); setShowAddressSheet(false); }}
          onAdd={() => { setShowAddressSheet(false); setShowAddressFlow(true); }}
          onClose={() => setShowAddressSheet(false)}
        />
      )}

      {/* Yangi manzil qo'shish oqimi (joylashuv → qidiruv → tafsilotlar) */}
      {showAddressFlow && (
        <AddressFlow
          onSave={(addr) => addAddress(addr)}
          onClose={() => setShowAddressFlow(false)}
        />
      )}

      {showPhoneEdit && (
        <div onClick={() => setShowPhoneEdit(false)} className="sheet-overlay">
          <div onClick={(e) => e.stopPropagation()} className="sheet">
            <div className="sheet__title">{t('phoneLabel')}</div>
            <input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              autoFocus
              className="input-lg"
            />
            <button onClick={savePhone} disabled={phoneDraft.trim().length < 9} className="btn-primary btn-block">
              {t('save')}
            </button>
          </div>
        </div>
      )}

      {/* SO'NGGI TEKSHIRUV — chek ko'rinishida, ongli tasdiqlash */}
      {showConfirm && (
        <OrderConfirmModal
          groups={groups}
          pricing={pricing}
          total={total}
          submitting={paying}
          onClose={() => setShowConfirm(false)}
          onConfirm={confirmAndSubmit}
        />
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="cart-summary__row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// "Hech narsani unutmadingizmi?" — savatдаgi restoran menyusидан tavsiya.
// Savatда bo'lmagan taomlarни ko'rsatadi (upsell).
function CartUpsell({ groups }) {
  const t = useT();
  const addItem = useCart((s) => s.addItem);
  const items = useCart((s) => s.items);
  const firstRestaurantId = groups[0]?.restaurant?.id;
  const { data: dishes = [] } = useDishes(firstRestaurantId);

  if (!firstRestaurantId || dishes.length === 0) return null;

  // Savatда bor taomlar ID'lari
  const inCartIds = new Set(items.map((i) => i.dish.id || i.dish._id));
  // Savatда yo'q, mavjud taomlar (eng ko'pi 6 ta)
  const suggestions = dishes
    .filter((d) => !inCartIds.has(d.id || d._id) && d.isAvailable !== false)
    .slice(0, 6);

  if (suggestions.length === 0) return null;

  const meta = groups[0].restaurant;
  const add = (dish) => {
    haptic();
    // Restoran meta'sini biriktiramiz (savat to'g'ri ishlashi uchun)
    addItem({
      ...dish,
      restaurantId: firstRestaurantId,
      restaurantName: meta.name,
      restaurantTint: meta.tint,
      restaurantIcon: meta.icon,
      restaurantDeliveryMin: meta.deliveryMin,
      restaurantDeliveryMax: meta.deliveryMax,
      restaurantDeliveryFee: meta.deliveryFee,
    }, 1, []);
  };

  return (
    <div className="cart-upsell">
      <h2 className="cart-upsell__title">{t('unforgettableTitle')}</h2>
      <div className="cart-upsell__row no-scrollbar">
        {suggestions.map((d) => (
          <div key={d.id || d._id} className="upsell-card">
            <div className="upsell-card__photo">
              <DishPhoto dish={d} height={110} radius={14} iconSize={34} />
            </div>
            <div className="upsell-card__name">{d.name}</div>
            <div className="upsell-card__price">{formatSom(d.price)}</div>
            <button onClick={() => add(d)} className="upsell-card__add" aria-label={t('add')}>
              <Icon name="plus" size={18} color="var(--brand)" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * "To'lov hali yakunlanmagan" eslatmasi.
 *
 * Mijoz Click sahifasidan to'lamasdan qaytganda ko'rinadi.
 * Ikki chiqish yo'li: to'lovni DAVOM ETTIRISH (eski buyurtma
 * uchun yangi havola) yoki undan VOZ KECHISH (savat saqlanadi,
 * yangi buyurtma bera oladi — eski awaiting_payment yozuv
 * serverda zararsiz osilib qoladi).
 */
function PendingPaymentNotice({ onRetry, onDismiss }) {
  const t = useT();
  return (
    <div className="cart-pending">
      <Icon name="info" size={18} color="var(--brand)" />
      <div className="cart-pending__text">
        <b>{t('paymentNotCompleted')}</b>
        <span>{t('previousOrderUnpaid')}</span>
      </div>
      <div className="cart-pending__actions">
        <button onClick={onDismiss} className="cart-pending__btn cart-pending__btn--ghost">
          {t('cancel')}
        </button>
        <button onClick={onRetry} className="cart-pending__btn cart-pending__btn--primary">
          {t('continueBtn')}
        </button>
      </div>
    </div>
  );
}
