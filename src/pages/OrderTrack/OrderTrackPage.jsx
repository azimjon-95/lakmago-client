import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { SupportChat } from '@/components/SupportChat/SupportChat';
import { useOrders } from '@/store/orders';
import { useOrderTracking } from '@/hooks/useOrderTracking';
import { useOrderTrack } from '@/hooks/useOrderTrack';
import { useI18n } from '@/i18n';
import { formatSom } from '@/lib/utils';
import { haptic, getTelegram } from '@/lib/telegram';
import { api } from '@/api';
import { TrackMap } from './TrackMap';
import './OrderTrack.css';

/*
 * ═══ BUYURTMA KUZATUVI ═══
 * Barcha ma'lumot serverdan (GET /orders/:id/track — services/orderTrack.js):
 * vaqt chizig'i, taxminiy vaqt (hisoblangan), kuryer (o'zi kiritgan ma'lumot + jonli joylashuv),
 * restoran va mijoz nuqtalari, taomlar. Soxta/tasodifiy qiymat YO'Q: ma'lumot bo'lmasa
 * tegishli blok ko'rsatilmaydi (masalan kuryer tayinlanmagan bo'lsa — kuryer kartasi yo'q).
 */
const TXT = {
  uz: {
    back: 'Orqaga', close: 'Yopish', order: 'Buyurtma',
    pending: ['Tasdiq kutilmoqda', 'Restoran javobini kutmoqda…'],
    accepted: ['Buyurtmangiz qabul qilindi', 'Tayyorlash boshlanadi…'],
    preparing: ['Buyurtmangiz tayyorlanmoqda', 'Restorandan olib chiqilishi kutilmoqda…'],
    ready: ['Buyurtma tayyor', 'Kuryer kutilmoqda'],
    delivering: ['Kuryer yo‘lda', 'Kuryer manzilingizga yetib bormoqda'],
    arrived: ['Kuryer yetib keldi', 'Buyurtmani qabul qiling'],
    delivered: ['Yetkazildi', 'Yoqimli ishtaha!'],
    readyPickup: ['Buyurtma tayyor', 'Restorandan olib ketishingiz mumkin'],
    cancelled: ['Bekor qilindi', ''],
    min: 'daqiqa', restaurant: 'Restoran', route: 'Yo‘nalish', you: 'Siz', courierOnWay: 'Kuryer yo‘lda',
    deliveries: 'ta yetkazib berish', orders: 'buyurtma', live: 'Jonli kuzatish', locWait: 'Joylashuv kutilmoqda',
    etaLine: 'Taxminiy yetib kelish vaqti', call: 'Qo‘ng‘iroq', message: 'Xabar',
    steps: { accepted: 'Qabul qilindi', preparing: 'Tayyorlanmoqda', delivering: 'Kuryer yo‘lda', arrived: 'Yetib keldi', ready: 'Tayyor', delivered: 'Tugadi' },
    delivery: 'Yetkazib berish', total: 'Jami', ask: 'Savol berish', callRest: 'Restoran bilan bog‘lanish',
    callAfterAccept: 'Restoran buyurtmani qabul qilgach qo‘ng‘iroq qilishingiz mumkin', noPhone: 'Restoran telefoni ko‘rsatilmagan',
    noOrder: 'Faol buyurtma yo‘q', home: 'Bosh sahifa', retry: 'Qayta urinish', loadFail: 'Ma’lumot yuklanmadi', reason: 'Sabab', fit: 'Hammasi', noMap: 'Xarita ma’lumoti yo‘q',
    vehicles: { Skuter: 'Skuter', Velosiped: 'Velosiped', Mashina: 'Mashina', Piyoda: 'Piyoda' },
  },
  uzc: {
    back: 'Орқага', close: 'Ёпиш', order: 'Буюртма',
    pending: ['Тасдиқ кутилмоқда', 'Ресторан жавобини кутмоқда…'],
    accepted: ['Буюртмангиз қабул қилинди', 'Тайёрлаш бошланади…'],
    preparing: ['Буюртмангиз тайёрланмоқда', 'Ресторандан олиб чиқилиши кутилмоқда…'],
    ready: ['Буюртма тайёр', 'Курьер кутилмоқда'],
    delivering: ['Курьер йўлда', 'Курьер манзилингизга етиб бормоқда'],
    arrived: ['Курьер етиб келди', 'Буюртмани қабул қилинг'],
    delivered: ['Етказилди', 'Ёқимли иштаҳа!'],
    readyPickup: ['Буюртма тайёр', 'Ресторандан олиб кетишингиз мумкин'],
    cancelled: ['Бекор қилинди', ''],
    min: 'дақиқа', restaurant: 'Ресторан', route: 'Йўналиш', you: 'Сиз', courierOnWay: 'Курьер йўлда',
    deliveries: 'та етказиб бериш', orders: 'буюртма', live: 'Жонли кузатиш', locWait: 'Жойлашув кутилмоқда',
    etaLine: 'Тахминий етиб келиш вақти', call: 'Қўнғироқ', message: 'Хабар',
    steps: { accepted: 'Қабул қилинди', preparing: 'Тайёрланмоқда', delivering: 'Курьер йўлда', arrived: 'Етиб келди', ready: 'Тайёр', delivered: 'Тугади' },
    delivery: 'Етказиб бериш', total: 'Жами', ask: 'Савол бериш', callRest: 'Ресторан билан боғланиш',
    callAfterAccept: 'Ресторан буюртмани қабул қилгач қўнғироқ қилишингиз мумкин', noPhone: 'Ресторан телефони кўрсатилмаган',
    noOrder: 'Фаол буюртма йўқ', home: 'Бош саҳифа', retry: 'Қайта уриниш', loadFail: 'Маълумот юкланмади', reason: 'Сабаб', fit: 'Ҳаммаси', noMap: 'Харита маълумоти йўқ',
    vehicles: { Skuter: 'Скутер', Velosiped: 'Велосипед', Mashina: 'Машина', Piyoda: 'Пиёда' },
  },
  ru: {
    back: 'Назад', close: 'Закрыть', order: 'Заказ',
    pending: ['Ожидает подтверждения', 'Ждём ответа ресторана…'],
    accepted: ['Заказ принят', 'Скоро начнём готовить…'],
    preparing: ['Заказ готовится', 'Ждём, пока заберут из ресторана…'],
    ready: ['Заказ готов', 'Ожидается курьер'],
    delivering: ['Курьер в пути', 'Курьер едет к вам'],
    arrived: ['Курьер прибыл', 'Заберите заказ'],
    delivered: ['Доставлено', 'Приятного аппетита!'],
    readyPickup: ['Заказ готов', 'Можно забирать в ресторане'],
    cancelled: ['Отменён', ''],
    min: 'мин', restaurant: 'Ресторан', route: 'Маршрут', you: 'Вы', courierOnWay: 'Курьер в пути',
    deliveries: 'доставок', orders: 'заказов', live: 'Онлайн-отслеживание', locWait: 'Ожидаем геопозицию',
    etaLine: 'Примерное время прибытия', call: 'Позвонить', message: 'Сообщение',
    steps: { accepted: 'Принят', preparing: 'Готовится', delivering: 'Курьер в пути', arrived: 'Прибыл', ready: 'Готов', delivered: 'Завершён' },
    delivery: 'Доставка', total: 'Итого', ask: 'Задать вопрос', callRest: 'Связаться с рестораном',
    callAfterAccept: 'Позвонить можно после того, как ресторан примет заказ', noPhone: 'Телефон ресторана не указан',
    noOrder: 'Нет активных заказов', home: 'На главную', retry: 'Повторить', loadFail: 'Не удалось загрузить', reason: 'Причина', fit: 'Всё', noMap: 'Нет данных карты',
    vehicles: { Skuter: 'Скутер', Velosiped: 'Велосипед', Mashina: 'Машина', Piyoda: 'Пешком' },
  },
};
const STEP_ICON = { accepted: 'check', preparing: 'flame', delivering: 'scooter', arrived: 'pin', ready: 'bag', delivered: 'circleCheck' };

// Reverse geocode ("Узбекистан, Ташкент, ...") → shahar nomi; o'zbekcha yozilishi
const CITY_UZ = { 'Ташкент': 'Toshkent', 'Самарканд': 'Samarqand', 'Бухара': 'Buxoro', 'Андижан': 'Andijon', 'Наманган': 'Namangan', 'Фергана': 'Farg‘ona', 'Нукус': 'Nukus', 'Карши': 'Qarshi', 'Навои': 'Navoiy', 'Джизак': 'Jizzax', 'Гулистан': 'Guliston', 'Термез': 'Termiz', 'Ургенч': 'Urganch', 'Коканд': 'Qo‘qon', 'Чирчик': 'Chirchiq', 'Ангрен': 'Angren', 'Алмалык': 'Olmaliq' };
function cityFrom(address, lang) {
  const parts = String(address || '').split(',').map((s) => s.trim()).filter(Boolean);
  // "Узбекистан, Наманганская область, Наманган, ..." → mamlakat, viloyat, tumanni o'tkazib, birinchi aholi punkti
  const skip = /Узбекистан|Oʻzbekiston|Uzbekistan|област|вилоят|viloyat|Республика|район|tuman|^улица|^проспект|массив|махалля/i;
  const city = parts.find((x) => !skip.test(x)) || '';
  if (!city || /\d/.test(city)) return '';
  const clean = city.replace(/^(город|г\.)\s*/i, '');
  return lang === 'ru' ? clean : (CITY_UZ[clean] || clean);
}

const fmtTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('ru-RU', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit', hour12: false });
};
/* Marker yozuvi uchun qisqa restoran nomi: 14 belgigacha, so'zlar kesilmaydi */
const shortName = (n = '') => {
  const clean = String(n).trim();
  if (clean.length <= 14) return clean;
  const words = clean.split(/\s+/);
  let out = '';
  for (const w of words) { if ((out + ' ' + w).trim().length > 14) break; out = (out + ' ' + w).trim(); }
  return out || clean.slice(0, 13) + '…';
};
/*
 * Telefon raqamini tel: uchun tozalash. Bo'shliq, tire, qavs olib tashlanadi;
 * 9 xonali mahalliy raqam bo'lsa +998 qo'shiladi.
 */
const normPhone = (p) => {
  const d = String(p || '').replace(/[^\d+]/g, '');
  if (!d) return '';
  const digits = d.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return d.startsWith('+') ? d : `+${digits}`;
};
const telHref = (p) => `tel:${normPhone(p)}`;

/*
 * Telegram Mini App ichida <a href="tel:"> ishlamaydi (WebView tel: havolani jim bloklaydi).
 * Shuning uchun qo'ng'iroq Telegram WebApp.openLink orqali ochiladi; WebApp bo'lmasa — oddiy tel:.
 */
function callPhone(phone) {
  const url = telHref(phone);
  const tg = getTelegram();
  haptic();
  try {
    if (tg?.openLink) { tg.openLink(url); return true; }
  } catch { /* pastda */ }
  window.location.href = url;
  return true;
}

export function OrderTrackPage() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const T = TXT[lang] || TXT.uz;
  const order = useOrders((s) => s.activeOrder);
  const applyBackendStatus = useOrders((s) => s.applyBackendStatus);
  const finishOrder = useOrders((s) => s.finishOrder);
  const loadActive = useOrders((s) => s.loadActive);
  const params = useParams();
  const [pickedId, setPickedId] = useState(params.orderId || null);
  useEffect(() => { if (params.orderId) setPickedId(params.orderId); }, [params.orderId]);
  const [full, setFull] = useState(false);
  const [city, setCity] = useState('');
  // Telegram ichida o'zining "Назад" tugmasi bor (useTelegramBack) — sahifadagi "Orqaga" takrorlanmasin
  const inTelegram = Boolean(getTelegram()?.initData);

  useEffect(() => { if (!order) loadActive?.(); }, [order, loadActive]);
  useOrderTracking(order?.subOrders.map((s) => s.backendId).filter(Boolean) ?? [], (backendId, status) => applyBackendStatus(backendId, status));

  /*
   * Qaysi buyurtma: URL'dagi ID (/order/track/:orderId — ro'yxat, nishon) yoki
   * tanlangan tab; bo'lmasa faol guruhdagi birinchi yakunlanmagan buyurtma.
   * URL'dagi buyurtma store'dagi faol guruhda bo'lmasa ham ochiladi (ma'lumot serverdan).
   */
  const subs = order?.subOrders || [];
  const storeSub = subs.find((s) => s.backendId === pickedId)
    || (!pickedId ? (subs.find((s) => !['delivered', 'cancelled'].includes(s.status)) || subs[0]) : null);
  const trackId = pickedId || storeSub?.backendId;
  const { data: tr, error, etaMinutes, refresh } = useOrderTrack(trackId);
  const sub = storeSub || (tr ? { backendId: tr.id, status: tr.status, orderNumber: tr.label, items: [] } : null);

  // Xaritani yopib turgan qatlamlar balandligi (yuqori kartalar, pastki varaq) — o'lchanadi.
  // Callback-ref + bitta ResizeObserver; o'lchash keyingi kadrda (sinxron setState sikli bo'lmasin).
  const topEl = useRef(null);
  const sheetEl = useRef(null);
  const roRef = useRef(null);
  const rafRef = useRef(0);
  const [insets, setInsets] = useState({ top: 260, bottom: 320 });
  const measure = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const top = topEl.current ? Math.round(topEl.current.getBoundingClientRect().bottom) : 260;
      const bottom = sheetEl.current ? Math.round(window.innerHeight - sheetEl.current.getBoundingClientRect().top) : 320;
      setInsets((p) => (Math.abs(p.top - top) > 4 || Math.abs(p.bottom - bottom) > 4 ? { top, bottom } : p));
    });
  }, []);
  const observe = useCallback((el) => {
    if (!el || typeof ResizeObserver === 'undefined') return;
    if (!roRef.current) roRef.current = new ResizeObserver(measure);
    roRef.current.observe(el);
    measure();
  }, [measure]);
  const topRef = useCallback((el) => { topEl.current = el; observe(el); }, [observe]);
  const sheetRef = useCallback((el) => { sheetEl.current = el; observe(el); }, [observe]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => { window.removeEventListener('resize', measure); roRef.current?.disconnect(); cancelAnimationFrame(rafRef.current); };
  }, [measure]);
  const [hint, setHint] = useState('');
  useEffect(() => { if (!hint) return undefined; const id = setTimeout(() => setHint(''), 3500); return () => clearTimeout(id); }, [hint]);

  // Xaritadagi shahar nomi — mijoz nuqtasidan (bir marta)
  const cp = tr?.customer?.point;
  useEffect(() => {
    if (!cp) return undefined;
    let dead = false;
    api.reverseGeocodeYandex(cp.lat, cp.lng).then((r) => { if (!dead) setCity(cityFrom(r?.address, lang)); }).catch(() => {});
    return () => { dead = true; };
  }, [cp?.lat, cp?.lng, lang]); // eslint-disable-line react-hooks/exhaustive-deps

  const itemsText = useMemo(
    () => (tr?.items || sub?.items?.map((i) => ({ name: i.dish?.name || i.name, quantity: i.quantity })) || []).map((i) => `${i.name} ×${i.quantity || 1}`).join(', '),
    [tr, sub],
  );

  if (!sub && trackId && !error) {
    return <div className="app-shell ot-empty"><span className="spinner" /></div>;
  }
  if (!sub) {
    return (
      <div className="app-shell ot-empty">
        <div className="text-muted">{T.noOrder}</div>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ marginTop: 16 }}>{T.home}</button>
      </div>
    );
  }

  const status = tr?.status || sub.status;
  const pickup = tr ? tr.fulfillment === 'pickup' : false;
  const bannerKey = tr?.currentStep === 'arrived' ? 'arrived'
    : (pickup && status === 'ready') ? 'readyPickup' : status;
  const [title, subtitle] = T[bannerKey] || T.accepted;
  const rest = tr?.restaurant;
  const courier = tr?.courier;
  const finished = status === 'delivered' || status === 'cancelled';
  // Restoranga qo'ng'iroq — restoran buyurtmani QABUL QILGANIDAN keyin (naqd buyurtmani u o'zi tasdiqlaydi)
  const canCallRest = !finished && status !== 'pending' && Boolean(rest?.phone);
  const showEta = etaMinutes != null && !finished;
  const etaScheduled = tr?.eta?.basis === 'scheduled';
  const itemLabel = tr?.items?.[0]?.name || '';

  const openRoute = () => {
    const p = rest?.point;
    if (!p) return;
    haptic();
    window.open(`https://yandex.com/maps/?rtext=~${p.lat},${p.lng}&rtt=auto`, '_blank', 'noopener');
  };

  return (
    <div className="ot">
      {/* Xarita — butun ekran orqasida */}
      <TrackMap
        orderId={sub.backendId}
        status={status}
        restaurant={rest}
        customer={tr?.customer}
        courier={courier}
        etaMinutes={etaMinutes}
        labels={{ you: T.you, courierOnWay: T.courierOnWay, min: T.min, fit: T.fit, noMap: T.noMap }}
        restaurantLabel={shortName(rest?.name)}
        cityLabel={city}
        insets={insets}
      />

      {/* Yuqoridagi yozuvlar xarita ustida o'qilishi uchun yengil oq tuman */}
      <div className="ot-fade" aria-hidden="true" />

      <div className="ot-top" ref={topRef}>
        {!inTelegram && (
          <button className="ot-back" onClick={() => navigate(-1)} aria-label={T.back}>
            <Icon name="chevronLeft" size={20} color="var(--ink)" /><span>{T.back}</span>
          </button>
        )}

        <div className="ot-title">
          <button className="ot-title__x" onClick={() => navigate('/')} aria-label={T.close}><Icon name="x" size={24} color="var(--ink)" /></button>
          <div className="ot-title__text">
            <h1>{T.order} #{tr?.groupId || tr?.label || sub.orderNumber}</h1>
            <p>{itemsText}</p>
          </div>
        </div>

        {subs.length > 1 && storeSub && (
          <div className="ot-tabs">
            {subs.map((s) => (
              <button key={s.backendId} className={s.backendId === sub.backendId ? 'is-on' : ''} onClick={() => setPickedId(s.backendId)}>{s.restaurant?.name}</button>
            ))}
          </div>
        )}

        {/* Holat */}
        <div className={`ot-status${status === 'cancelled' ? ' is-cancelled' : ''}`}>
          <span className="ot-status__icon"><Icon name={status === 'delivered' ? 'circleCheck' : 'clock'} size={18} color="#fff" strokeWidth={2.4} /></span>
          <div className="ot-status__text">
            <b>{title}</b>
            <span>{status === 'cancelled' && tr?.cancelReason ? `${T.reason}: ${tr.cancelReason}` : subtitle}</span>
          </div>
          {showEta && (
            <span className="ot-status__eta">
              <Icon name="clock" size={14} color="#fff" strokeWidth={2.4} />
              {etaScheduled ? fmtTime(tr.eta.at) : `${etaMinutes} ${T.min}`}
            </span>
          )}
        </div>

        {/* Restoran */}
        {rest && (
          <div className="ot-restrow">
            <div className="ot-rest">
              {rest.imageUrl ? <img src={rest.imageUrl} alt="" className="ot-rest__img" /> : <span className="ot-rest__img ot-rest__img--ph"><Icon name="store" size={22} color="var(--brand)" /></span>}
              <div className="ot-rest__body">
                <b>{rest.name}</b>
                <span><i className="ot-dot" /> {T.restaurant}</span>
                {tr.distanceKm != null && <span className="ot-rest__km"><Icon name="bike" size={13} color="#6F6F69" /> {Number(tr.distanceKm).toFixed(1)} km</span>}
              </div>
              <Icon name="chevronRight" size={16} color="#9A9A94" />
            </div>
            {rest.point && (
              <button type="button" className="ot-route" onClick={openRoute}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#2563EB" aria-hidden="true"><path d="M3 11 22 2l-9 19-2-8-8-2z" /></svg>{T.route}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pastki varaq */}
      <div className={`ot-sheet${full ? ' is-full' : ''}`} ref={sheetRef}>
        <button className="ot-sheet__grip" onClick={() => setFull((v) => !v)} aria-label="sheet"><span /></button>
        <div className="ot-sheet__scroll">
          {!tr && !error && <div className="ot-skel"><i /><i /><i /></div>}
          {error && !tr && (
            <div className="ot-error"><p>{T.loadFail}</p><button onClick={refresh} className="btn-primary">{T.retry}</button></div>
          )}

          {tr && (
            <>
              {courier && (
                <div className="ot-courier">
                  <span className="ot-courier__avatar">{courier.name.slice(0, 1).toUpperCase()}</span>
                  <div className="ot-courier__info">
                    <b>{courier.name}</b>
                    <span className="ot-courier__rate">
                      {courier.rating != null && <><svg width="14" height="14" viewBox="0 0 24 24" fill="#FF8A00" aria-hidden="true"><path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.5L12 17.3l-5.9 3.2 1.3-6.5-4.9-4.6 6.6-.8z" /></svg><em>{courier.rating.toFixed(1)}</em></>}
                      <small>{courier.rating != null ? `(${courier.deliveries} ${T.orders})` : `${courier.deliveries} ${T.deliveries}`}</small>
                    </span>
                    {courier.vehicleLabel && <span className="ot-courier__veh"><Icon name={courier.vehicle === 'car' ? 'truck' : 'bike'} size={15} color="#111" /> {T.vehicles[courier.vehicleLabel] || courier.vehicleLabel}</span>}
                  </div>
                  {courier.phone && (
                    <div className="ot-courier__btns">
                      <button type="button" className="ot-circle" aria-label={T.call} onClick={() => callPhone(courier.phone)}><Icon name="phone" size={19} color="#111" strokeWidth={2.2} /></button>
                      <a href={`sms:${courier.phone.replace(/[^\d+]/g, '')}`} className="ot-circle" aria-label={T.message} onClick={() => haptic()}><Icon name="messageCircle" size={19} color="#111" strokeWidth={2.2} /></a>
                    </div>
                  )}
                </div>
              )}

              {status === 'delivering' && (
                <div className="ot-live">
                  <span className="ot-live__icon"><Icon name="scooter" size={20} color="#17803F" strokeWidth={2.3} /></span>
                  <div className="ot-live__text">
                    <b>{T.delivering[1]}</b>
                    {etaMinutes != null && <span>{T.etaLine}: {etaMinutes} {T.min}</span>}
                  </div>
                  <span className={`ot-live__badge${courier?.location ? '' : ' is-wait'}`}>
                    <Icon name="radio" size={16} color={courier?.location ? 'var(--success)' : 'var(--muted)'} />
                    {courier?.location ? T.live : T.locWait}
                  </span>
                </div>
              )}

              {/* Vaqt chizig'i — haqiqiy vaqt belgilari */}
              <div className="ot-steps">
                {tr.steps.map((s, i) => (
                  <div key={s.key} className={`ot-step${s.done ? ' is-done' : ''}${s.active ? ' is-active' : ''}`}>
                    <span className="ot-step__dot"><Icon name={STEP_ICON[s.key] || 'check'} size={14} color={s.done || s.active ? '#fff' : '#9A9A94'} strokeWidth={2.6} /></span>
                    {i < tr.steps.length - 1 && <span className={`ot-step__line${s.done ? ' is-done' : ''}`} />}
                    <span className="ot-step__label">{T.steps[s.key]}</span>
                    <span className="ot-step__time">{fmtTime(s.at)}</span>
                  </div>
                ))}
              </div>

              {/* Taomlar va summa */}
              <div className="ot-sum">
                {tr.items.map((it, i) => (
                  <div key={i} className="ot-sum__item">
                    {it.imageUrl ? <img src={it.imageUrl} alt="" className="ot-sum__img" /> : <span className="ot-sum__img ot-sum__img--ph"><Icon name="bag" size={20} color="var(--muted)" /></span>}
                    <div className="ot-sum__name"><b>{it.name}</b><span>{it.quantity} × {formatSom(it.unitPrice)}</span></div>
                    <b className="ot-sum__price">{formatSom(it.total)}</b>
                  </div>
                ))}
                {tr.deliveryFee > 0 && (
                  <div className="ot-sum__row"><span><Icon name="bike" size={14} color="#7A7A74" /> {T.delivery}</span><span>{formatSom(tr.deliveryFee)}</span></div>
                )}
                <div className="ot-sum__row ot-sum__row--total"><span>{T.total}</span><span>{formatSom(tr.total)}</span></div>
              </div>
            </>
          )}
        </div>

        {hint && <div className="ot-hint" role="status">{hint}</div>}
        <div className="ot-actions">
          <button type="button" className="ot-actions__sec" onClick={() => { haptic(); window.dispatchEvent(new Event('lokma:open-support')); }}>
            <Icon name="headphones" size={18} color="#111" />{T.ask}
          </button>
          {finished ? (
            <button type="button" className="ot-actions__pri" onClick={() => { finishOrder(); navigate('/'); }}>{T.home}</button>
          ) : (
            <button
              type="button"
              className={`ot-actions__pri${canCallRest ? '' : ' is-off'}`}
              aria-disabled={!canCallRest}
              onClick={() => {
                if (!canCallRest) { haptic(); setHint(!rest?.phone ? T.noPhone : T.callAfterAccept); return; }
                callPhone(rest.phone);
              }}
            >
              <Icon name="phone" size={17} color="#fff" />{T.callRest}
            </button>
          )}
        </div>
      </div>

      {/* Savol berish — qo'llab-quvvatlash chati (suzuvchi tugmasiz) */}
      <SupportChat hideFab />
    </div>
  );
}
