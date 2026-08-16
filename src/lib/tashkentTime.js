/**
 * O'zbekiston (Toshkent) vaqti — QURILMA vaqtidan MUSTAQIL.
 *
 * Nima uchun kerak: restoran ish vaqti, bron slotlari va h.k.
 * doim Toshkent vaqtiga bog'liq. Agar `new Date().getHours()`
 * kabi qurilmaning O'Z (mahalliy) vaqtidan foydalanilsa,
 * boshqa mamlakatdan kirgan foydalanuvchi uchun noto'g'ri
 * natija chiqadi — masalan Toshkentda 23:51 bo'lsa-yu, Moskva
 * (UTC+3) dan kirgan foydalanuvchi hali 21:51 ko'rib, restoran
 * "ochiq" bo'lib qolaveradi.
 *
 * Intl.DateTimeFormat orqali — tashqi kutubxonasiz, har doim
 * to'g'ri (O'zbekiston DST qo'llamaydi, doim UTC+5; IANA nomi
 * orqali hisoblangani uchun kelajakda o'zgarsa ham ishlayveradi).
 */

const TZ = 'Asia/Tashkent';

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
});

/** Berilgan lahzaning Toshkentdagi taqvim/soat qismlari. */
export function tashkentParts(date = new Date()) {
  const parts = partsFormatter.formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour') % 24, // ba'zi brauzerlarda "24:00" qaytishi mumkin
    minute: get('minute'),
    second: get('second'),
  };
}

/** Toshkent vaqtida kun boshidan necha daqiqa o'tgani (0–1439). */
export function tashkentMinutesOfDay(date = new Date()) {
  const p = tashkentParts(date);
  return p.hour * 60 + p.minute;
}

/** Ikki lahza Toshkentda bir xil kalendar kunidami. */
export function isSameTashkentDay(a, b) {
  const pa = tashkentParts(a);
  const pb = tashkentParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/**
 * "Bugun" ni Toshkent bo'yicha JS Date obyektiga aylantiradi.
 *
 * Muhim: natija LOKAL konstruktor bilan yaratiladi (vaqti
 * mahalliy yarim tun), lekin Y/O/K raqamlari TOSHKENT
 * kalendaridan olingan — shuning uchun getFullYear()/getMonth()/
 * getDate() kabi mahalliy o'quvchilar bilan o'qilganda ham
 * to'g'ri Toshkent kunini beradi. Sana tanlagich ("Bugun, Ertaga
 * ...") shu asosda quriladi.
 */
export function tashkentTodayAsLocalDate(now = new Date()) {
  const p = tashkentParts(now);
  return new Date(p.year, p.month - 1, p.day);
}
