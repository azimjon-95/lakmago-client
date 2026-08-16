/**
 * Bron uchun bo'sh vaqtlar.
 *
 * Vaqtlar restoran ish vaqtidan hosil qilinadi — avval ro'yxat
 * qattiq yozilgan edi (18:00–20:30) va restoran soat 10 da
 * ochilsa ham kunduzgi vaqtga bron qilib bo'lmasdi.
 *
 * Mantiq toza funksiya: UI'dan mustaqil, tekshirish oson.
 *
 * MUHIM: "hozir necha soat/kun" — doim TOSHKENT vaqtida
 * hisoblanadi (lib/tashkentTime.js), foydalanuvchining o'z
 * qurilmasi qaysi vaqt mintaqasida bo'lishidan qat'i nazar.
 * Aks holda masalan Moskvadan kirgan mijoz uchun bugungi
 * bo'sh vaqtlar noto'g'ri hisoblanardi (2 soat farq bilan).
 */
import { tashkentMinutesOfDay, isSameTashkentDay } from './tashkentTime';

const DEFAULT_OPEN = '10:00';
const DEFAULT_CLOSE = '22:00';

/** "HH:MM" → daqiqa. Noto'g'ri bo'lsa null. */
function toMinutes(hhmm) {
  const m = String(hhmm ?? '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Daqiqa → "HH:MM" (sutkadan oshsa aylanadi). */
function toLabel(mins) {
  const m = ((mins % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Tanlangan sana uchun bo'sh vaqtlar ro'yxati.
 *
 * @param restaurant  openTime / closeTime bo'lgan obyekt
 * @param date        tanlangan sana (Date)
 * @param opts.stepMin   qadam, daqiqada (30)
 * @param opts.leadMin   hozirdan keyingi eng yaqin vaqt (45 daq)
 * @param opts.lastMin   yopilishdan necha daqiqa oldin to'xtaydi (60)
 * @returns ["18:00", "18:30", ...]
 */
export function buildSlots(restaurant, date, opts = {}) {
  const { stepMin = 30, leadMin = 45, lastMin = 60, now = new Date() } = opts;

  const open = toMinutes(restaurant?.openTime) ?? toMinutes(DEFAULT_OPEN);
  let close = toMinutes(restaurant?.closeTime) ?? toMinutes(DEFAULT_CLOSE);

  // Yarim tundan oshadigan ish vaqti: 10:00–02:00
  if (close <= open) close += 1440;

  // Oxirgi bron yopilishdan oldinroq tugaydi — mijoz o'tirib
  // ulgurishi kerak
  const lastStart = close - lastMin;

  // Bugungi kun bo'lsa o'tib ketgan vaqtlar chiqmaydi
  const todaySelected = isSameTashkentDay(date, now);
  const earliest = todaySelected
    ? Math.max(open, tashkentMinutesOfDay(now) + leadMin)
    : open;

  // Qadamga yaxlitlash: 19:07 + 45 = 19:52 → 20:00
  const first = Math.ceil(earliest / stepMin) * stepMin;

  const out = [];
  for (let m = first; m <= lastStart; m += stepMin) out.push(toLabel(m));
  return out;
}

/** Ro'yxatdagi eng yaqin bo'sh vaqt (yo'q bo'lsa null). */
export function firstSlot(slots) {
  return slots.length > 0 ? slots[0] : null;
}

/** Tanlangan vaqt hali ham mavjudmi; bo'lmasa eng yaqinini beradi. */
export function keepOrReset(time, slots) {
  if (time && slots.includes(time)) return time;
  return firstSlot(slots);
}
