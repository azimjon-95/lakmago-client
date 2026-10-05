/**
 * Restoran ish vaqti.
 *
 * openTime/closeTime "HH:MM" ko'rinishida saqlanadi — bu doim
 * O'ZBEKISTON (Toshkent) mahalliy vaqti. Shuning uchun "hozir
 * necha soat" ni ham DOIM Toshkent vaqtida hisoblash kerak —
 * foydalanuvchining o'z qurilmasi qaysi mamlakatda/vaqt
 * mintaqasida bo'lishidan qat'i nazar (lib/tashkentTime.js).
 * Yarim tundan oshadigan vaqt ham to'g'ri hisoblanadi
 * (masalan 10:00–02:00).
 */
import { tashkentMinutesOfDay } from './tashkentTime';

/** "HH:MM" → daqiqalarda. Noto'g'ri bo'lsa null. */
function toMinutes(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const m = hhmm.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/* ═══ ISH KUNLARI (workingDays) ═══
 * Server bilan bir xil kalitlar: 'mon'..'sun'. Bo'sh / yo'q — HAR KUNI
 * ishlaydi (restoran panelidagi "Tanlanmasa har kuni ishlaydi").
 * Hafta kuni ham DOIM Toshkent bo'yicha (qurilma vaqtidan mustaqil).
 */
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEK_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_SHORT = { mon: 'Du', tue: 'Se', wed: 'Ch', thu: 'Pa', fri: 'Ju', sat: 'Sh', sun: 'Ya' };
const DAY_FULL = {
  mon: 'Dushanba', tue: 'Seshanba', wed: 'Chorshanba', thu: 'Payshanba',
  fri: 'Juma', sat: 'Shanba', sun: 'Yakshanba',
};

const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Tashkent', weekday: 'short' });

/** Toshkentdagi hafta kuni kaliti: 'mon'..'sun'. */
export function tashkentDayKey(now = new Date()) {
  const k = weekdayFmt.format(now).toLowerCase().slice(0, 3);
  return DAY_KEYS.includes(k) ? k : DAY_KEYS[now.getDay()];
}

/** Restoranning ish kunlari (to'g'ri kalitlar). Cheklov yo'q bo'lsa null. */
export function workingDaysOf(r) {
  const raw = r?.workingDays ?? r?.restaurantWorkingDays;
  if (!Array.isArray(raw)) return null;
  const days = WEEK_ORDER.filter((d) => raw.includes(d));
  return days.length === 0 || days.length === 7 ? null : days;
}

/** Bugun (Toshkent kalendar kuni) ish kuni EMASmi. */
export function isOffToday(r, now = new Date()) {
  const days = workingDaysOf(r);
  return Boolean(days) && !days.includes(tashkentDayKey(now));
}

/** Ketma-ket kunlarni qisqartiradi: [mon..fri] → "Du–Ju", [mon,wed,fri] → "Du, Ch, Ju". */
function compressDays(days) {
  const idx = days.map((d) => WEEK_ORDER.indexOf(d)).sort((a, b) => a - b);
  const parts = [];
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1] === idx[j] + 1) j += 1;
    const a = DAY_SHORT[WEEK_ORDER[idx[i]]]; const b = DAY_SHORT[WEEK_ORDER[idx[j]]];
    parts.push(j - i >= 2 ? `${a}–${b}` : (j > i ? `${a}, ${b}` : a));
    i = j + 1;
  }
  return parts.join(', ');
}

/** "Du–Ju" — ish kunlari. Har kuni ishlasa null. */
export function workDaysLabel(r) {
  const days = workingDaysOf(r);
  return days ? compressDays(days) : null;
}

/** "Sh, Ya" — dam olish kunlari. Har kuni ishlasa null. */
export function offDaysLabel(r) {
  const days = workingDaysOf(r);
  if (!days) return null;
  return compressDays(WEEK_ORDER.filter((d) => !days.includes(d)));
}

/**
 * Restoran hozir ochiqmi.
 * Ish vaqti ko'rsatilmagan bo'lsa — vaqt bo'yicha cheklov yo'q.
 * Ish kunlari belgilangan bo'lsa — dam olish kunida YOPIQ
 * (server: services/restaurantTime.js isRestaurantOpen bilan bir xil).
 */
export function isOpenNow(restaurant, now = new Date()) {
  const open = toMinutes(restaurant?.openTime);
  const close = toMinutes(restaurant?.closeTime);
  const days = workingDaysOf(restaurant);
  const cur = tashkentMinutesOfDay(now);

  if (days) {
    const today = tashkentDayKey(now);
    // Yarim tundan oshgan vaqt (10:00–02:00): 01:00 da KECHAGI ish kuni davom etyapti
    if (open !== null && close !== null && open > close && cur < close) {
      const yesterday = DAY_KEYS[(DAY_KEYS.indexOf(today) + 6) % 7];
      if (!days.includes(yesterday)) return false;
    } else if (!days.includes(today)) {
      return false;
    }
  }

  // Vaqt belgilanmagan — cheklov yo'q
  if (open === null || close === null) return true;
  // Bir xil bo'lsa 24 soat ishlaydi
  if (open === close) return true;

  // Odatiy holat: 09:00–23:00
  if (open < close) return cur >= open && cur < close;

  // Yarim tundan oshadi: 10:00–02:00
  return cur >= open || cur < close;
}

/** Ish vaqti matni: "09:00 – 23:00". Yo'q bo'lsa null. */
export function workHoursLabel(restaurant) {
  const open = toMinutes(restaurant?.openTime);
  const close = toMinutes(restaurant?.closeTime);
  if (open === null || close === null) return null;
  if (open === close) return '24 soat';
  return `${restaurant.openTime} – ${restaurant.closeTime}`;
}

/**
 * Yopiq bo'lsa qachon ochilishini aytadi.
 * Ochiq bo'lsa null. Ish kunlari hisobga olinadi:
 * "10:00 da ochiladi", "Ertaga 10:00 da ochiladi", "Dushanba 10:00 da ochiladi".
 */
export function nextOpenLabel(restaurant, now = new Date()) {
  if (isOpenNow(restaurant, now)) return null;
  const open = toMinutes(restaurant?.openTime);
  const days = workingDaysOf(restaurant);
  const cur = tashkentMinutesOfDay(now);
  const at = open !== null ? ` ${restaurant.openTime} da` : '';

  if (!days) {
    if (open === null) return null;
    return cur < open ? `${restaurant.openTime} da ochiladi` : `Ertaga ${restaurant.openTime}`;
  }

  const today = tashkentDayKey(now);
  if (days.includes(today) && open !== null && cur < open) return `Bugun${at} ochiladi`;
  const start = DAY_KEYS.indexOf(today);
  for (let k = 1; k <= 7; k += 1) {
    const d = DAY_KEYS[(start + k) % 7];
    if (days.includes(d)) return `${k === 1 ? 'Ertaga' : DAY_FULL[d]}${at} ochiladi`;
  }
  return null;
}
