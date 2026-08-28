import { useState, useEffect, useMemo } from 'react';
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
import './Cart.css';


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
  // Qaysi to'lov tizimlari ulangan
  const [payStatus, setPayStatus] = useState({ payme: false, click: false });
  // Onlayn to'lov umuman mavjudmi
  const onlineAvailable = payStatus.payme || payStatus.click;

  // Karta tanlanganda qaysi tizim ishlatiladi
  const pickCardProvider = () => {
    haptic();
    // Avval Payme, yo'q bo'lsa Click
    setPaymentMethod(payStatus.payme ? 'payme' : 'click');
  };

  // Naqdmi yoki karta orqalimi
  const isCard = paymentMethod === 'payme' || paymentMethod === 'click';

  useEffect(() => {
    api.getPaymentStatus()
      .then((st) => setPayStatus(st || { payme: false, click: false }))
      .catch(() => {});
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
    if (window.confirm('Savatni tozalaysizmi?')) {
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

  function confirmAndSubmit() {
    setShowConfirm(false);
    setPaying(true);
    setLastPaymentMethod(paymentMethod);
    const addrLabel = isPickup
      ? ''
      : `${selectedAddress.title} — ${selectedAddress.address}`;
    const PAY_LABEL = { cash: t('cash'), payme: 'Payme', click: 'Click' };
    const paymentLabel = PAY_LABEL[paymentMethod] || t('cash');
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
          navigate('/orders');
          return;
        }

        // KARTA — buyurtma "to'lov kutilmoqda" holatida yaratildi,
        // restoranga hali KO'RINMAYDI. Pul kelgach avtomatik chiqadi.
        const orderId = created?.orderId;

        if (!orderId) {
          // Buyurtma ID kelmadi — to'lovni boshlab bo'lmaydi.
          // Savat saqlanadi, mijoz qayta urinishi mumkin.
          setPaying(false);
          alert('Buyurtma yaratildi, lekin to‘lovni boshlab bo‘lmadi.\n'
            + 'Buyurtmalar bo‘limidan to‘lovni davom ettiring.');
          navigate('/orders');
          return;
        }

        try {
          const { url } = await api.getPaymentLink(orderId, paymentMethod);

          // Havola olindi — endi savatni tozalashimiz mumkin
          useCart.getState().clear();
          setPaying(false);

          const tg = getTelegram();
          if (tg?.openLink) tg.openLink(url);
          else window.location.href = url;

          setTimeout(() => navigate('/orders'), 600);
        } catch (e) {
          // To'lov havolasi olinmadi — savat SAQLANADI.
          // Buyurtma 'awaiting_payment' holatida qoladi va
          // restoranga ko'rinmaydi. Mijoz qayta urinishi mumkin.
          setPaying(false);
          alert(
            (e.message || 'To‘lov tizimiga ulanib bo‘lmadi')
            + '\n\nSavatingiz saqlandi. Qayta urinib ko‘ring yoki '
            + 'naqd to‘lovni tanlang.',
          );
        }
      })
      .catch((e) => {
        // Buyurtma YARATILMADI — savat saqlanadi, mijoz
        // taomlarini yo'qotmaydi va qayta urinishi mumkin.
        setPaying(false);
        alert(
          (e?.message || 'Buyurtma yuborilmadi')
          + '\n\nSavatingiz saqlandi. Qayta urinib ko‘ring.',
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
                : `${groups.length} ta muassasa`}
            </div>
          )}
        </div>

        <button onClick={confirmClear} aria-label="Tozalash" className="cart-header__btn">
          <Icon name="trash" size={19} color="var(--muted)" />
        </button>
      </header>

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
      <div className="cart-section-label">Qanday olasiz</div>
      <div className="cart-fulfillment">
        <button
          onClick={() => { if (deliveryOff) return; haptic(); setFulfillment('delivery'); }}
          disabled={!!deliveryOff}
          className={`cart-ftab ${fulfillment === 'delivery' ? 'is-active' : ''} ${deliveryOff ? 'is-disabled' : ''}`}
        >
          <Icon name="bike" size={19} color={fulfillment === 'delivery' ? 'var(--brand)' : 'var(--muted)'} />
          <span className="cart-ftab__title">Yetkazib berish</span>
          <span className="cart-ftab__sub">
            {deliveryOff
              ? 'Mavjud emas'
              : (pricing.deliveryFee === 0 ? 'Bepul' : formatSom(pricing.deliveryFee))}
          </span>
        </button>
        <button
          onClick={() => { haptic(); setFulfillment('pickup'); }}
          className={`cart-ftab ${fulfillment === 'pickup' ? 'is-active' : ''}`}
        >
          <Icon name="bag" size={19} color={fulfillment === 'pickup' ? 'var(--brand)' : 'var(--muted)'} />
          <span className="cart-ftab__title">O'zim olib ketaman</span>
        </button>
      </div>

      {/* Yetkazish mavjud emasligi haqida aniq ogohlantirish */}
      {deliveryOff && (
        <div className="cart-delivery-off">
          <Icon name="info" size={16} color="var(--appetite)" />
          <span>
            {deliveryOff.length === 1
              ? `${deliveryOff[0].name} yetkazib berish xizmatini ko'rsatmaydi.`
              : 'Savatdagi ba‘zi muassasalar yetkazib berish xizmatini ko‘rsatmaydi.'}
            {' '}Buyurtmani o'zingiz olib ketishingiz mumkin.
          </span>
        </div>
      )}

      {/* Vaqt — hozir yoki belgilangan */}
      <div className="cart-section-label">Qachon</div>
      <div className="cart-timing">
        <div className="cart-timing__tabs">
          <button
            onClick={() => { haptic(); setTimingMode('asap'); }}
            className={`cart-ttab ${timingMode === 'asap' ? 'is-active' : ''}`}
          >
            {isPickup ? 'Tayyor bo‘lishi bilan' : 'Imkon qadar tez'}
          </button>
          <button
            onClick={() => { haptic(); setTimingMode('scheduled'); }}
            className={`cart-ttab ${timingMode === 'scheduled' ? 'is-active' : ''}`}
          >
            Vaqtga belgilash
          </button>
        </div>

        {timingMode === 'asap' ? (
          <div className="cart-timing__hint">
            <Icon name="clock" size={15} color="var(--success)" />
            <span>
              {isPickup
                ? `Taxminan ${readyTimeLabel} da tayyor bo'ladi`
                : `Taxminan ${etaLabel} da yetkaziladi`}
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
            <div className="cart-pickup-info__title">Olib ketish manzili</div>
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
          <div className="cart-field__label">Telefon</div>
        </div>
        <Icon name="chevronRight" size={18} color="var(--muted)" />
      </button>

      {/* To'lov */}
      <div className="cart-section-label">To'lov</div>
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
            <span>Karta orqali</span>
            {isCard && <Icon name="circleCheck" size={15} color="var(--success)" />}
          </button>
        </div>

        {/* Onlayn to'lov ulanmagan bo'lsa tushuntiramiz */}
        {!onlineAvailable && (
          <p className="cart-payment__note">
            Karta orqali to'lov hozircha mavjud emas — kuryerga naqd to'laysiz
          </p>
        )}

        {/* Qaysi tizim orqali — ikkalasi ham ulangan bo'lsa */}
        {isCard && payStatus.payme && payStatus.click && (
          <div className="cart-providers">
            <button
              onClick={() => { haptic(); setPaymentMethod('payme'); }}
              className={`cart-provider ${paymentMethod === 'payme' ? 'is-active' : ''}`}
            >
              Payme
            </button>
            <button
              onClick={() => { haptic(); setPaymentMethod('click'); }}
              className={`cart-provider ${paymentMethod === 'click' ? 'is-active' : ''}`}
            >
              Click
            </button>
          </div>
        )}

        {/* Karta tanlash — faqat karta to'lovi tanlanganda */}
        {isCard && (
          <div className="cart-cards">
            {cards.length === 0 ? (
              <button onClick={() => navigate('/cards')} className="cart-cards__add">
                <Icon name="plus" size={16} color="var(--brand)" /> Karta qo'shish
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
                    {c.isDefault && <span className="cart-card__tag">Asosiy</span>}
                    {selectedCard?._id === c._id && (
                      <Icon name="circleCheck" size={15} color="var(--success)" />
                    )}
                  </button>
                ))}
                <button onClick={() => navigate('/cards')} className="cart-cards__manage">
                  Kartalarni boshqarish
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Qo'shimcha tavsiya — "Hech narsani unutmadingizmi?" */}
      <CartUpsell groups={groups} />

      {/* Bonus bilan to'lash (referal bonusи bor bo'lsa) */}
      {bonusBalance > 0 && (
        <button onClick={() => setUseBonus((v) => !v)} className={`cart-bonus ${useBonus ? 'is-active' : ''}`}>
          <div className="cart-bonus__left">
            <Icon name="gift" size={20} color={useBonus ? 'var(--success)' : 'var(--brand)'} />
            <div>
              <div className="cart-bonus__title">Bonus bilan to'lash</div>
              <div className="cart-bonus__balance">Mavjud: {formatSom(bonusBalance)}</div>
            </div>
          </div>
          <div className={`cart-bonus__toggle ${useBonus ? 'is-on' : ''}`}>
            <div className="cart-bonus__knob" />
          </div>
        </button>
      )}

      {/* Hisob */}
      <div className="cart-section-label">Hisob</div>
      <div className="cart-summary">
        <Row label="Mahsulotlar" value={formatSom(pricing.subtotal)} />
        {!isPickup && (
          <Row
            label={
              pricing.perRestaurant?.[0]?.quote?.distanceKm
                ? `Yetkazish · ${pricing.perRestaurant[0].quote.distanceKm} km`
                : 'Yetkazish'
            }
            value={
              quoteLoading ? '...'
                : pricing.deliveryFee === 0 ? t('free')
                  : formatSom(pricing.deliveryFee)
            }
          />
        )}
        {pricing.serviceFee > 0 && (
          <Row label="Xizmat haqi" value={formatSom(pricing.serviceFee)} />
        )}
        {/* Olib ketish chegirmasi — mijoz nima uchun arzonlaganini
            ko'rishi kerak, aks holda summa tushunarsiz o'zgaradi */}
        {pricing.pickupDiscount > 0 && (
          <div className="cart-summary__row cart-summary__row--bonus">
            <span>🛍 O'zi olib ketish chegirmasi</span>
            <span>−{formatSom(pricing.pickupDiscount)}</span>
          </div>
        )}
        {bonusApplied > 0 && (
          <div className="cart-summary__row cart-summary__row--bonus">
            <span>🎁 Bonus chegirmasi</span>
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
              ? "O'zingiz olib ketasiz"
              : pricing.deliveryFee === 0
                ? 'Bepul yetkazib berish'
                : `Yetkazish · ${formatSom(pricing.deliveryFee)}`}
          </span>
          <span className="cart-footer__eta">{etaText}</span>
        </div>

        {/* Bepul yetkazishgacha qolgan summa */}
        {gapToFree > 0 && (
          <div className="cart-footer__gap">
            Bepul yetkazishgacha <b>{formatSom(gapToFree)}</b> qoldi
          </div>
        )}

        {/* Yetkazish radiusidan tashqarida */}
        {pricing.outOfRange?.map((r) => (
          <div key={`range-${r.restaurant.id}`} className="cart-footer__warn cart-footer__warn--closed">
            <Icon name="info" size={14} color="var(--danger)" />
            <span>{r.quote.reason || `${r.restaurant.name} bu manzilga yetkazmaydi`}</span>
          </div>
        ))}

        {/* Yopiq restoranlar */}
        {pricing.closed.map((c) => {
          const r = c.restaurant;
          return (
            <div key={`closed-${r.id || r._id}`} className="cart-footer__warn cart-footer__warn--closed">
              <Icon name="clock" size={14} color="var(--danger)" />
              <span>
                <b>{r.name}</b> hozir yopiq
                {r.openTime && ` · Ish vaqti ${r.openTime}–${r.closeTime}`}
              </span>
            </div>
          );
        })}

        {/* Minimal summaga yetmagan restoranlar */}
        {pricing.blocked.map((b) => (
          <div key={b.restaurant.id || b.restaurant._id} className="cart-footer__warn">
            <Icon name="info" size={14} color="var(--info)" />
            <span>
              <b>{b.restaurant.name}</b>: yana{' '}
              <b>{formatSom(b.minCheck.missing)}</b>lik mahsulot qo'shing
            </span>
          </div>
        ))}

        {/* To'lov tugmasi (soni + summa) */}
        <button
          onClick={handlePlaceOrder}
          disabled={paying || !pricing.canOrder}
          className="cart-paybtn"
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
            <div className="sheet__title">Telefon</div>
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
      <h2 className="cart-upsell__title">Hech narsani unutmadingizmi?</h2>
      <div className="cart-upsell__row no-scrollbar">
        {suggestions.map((d) => (
          <div key={d.id || d._id} className="upsell-card">
            <div className="upsell-card__photo">
              <DishPhoto dish={d} height={110} radius={14} iconSize={34} />
            </div>
            <div className="upsell-card__name">{d.name}</div>
            <div className="upsell-card__price">{formatSom(d.price)}</div>
            <button onClick={() => add(d)} className="upsell-card__add" aria-label="Qo'shish">
              <Icon name="plus" size={18} color="var(--brand)" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
