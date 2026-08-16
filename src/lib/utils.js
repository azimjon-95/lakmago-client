import { tashkentParts } from './tashkentTime';

export function formatSom(value) {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ') + " so'm";
}

export function formatSomShort(value) {
  return value.toLocaleString('ru-RU').replace(/,/g, ' ');
}

export function buildOptionKey(dishId, optionIds) {
  return `${dishId}__${optionIds.sort().join('-')}`;
}

/* ═══════════════════════════════════════════
   Sana — o'zbekcha

   toLocaleDateString('uz') brauzerlarda ishonchsiz: ba'zilari
   "M08 9" kabi chiqaradi (ICU ma'lumotlari to'liq emas).
   Shuning uchun qo'lda formatlaymiz.
   ═══════════════════════════════════════════ */
const UZ_MONTHS = [
  'yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun',
  'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr',
];

const UZ_WEEKDAYS = ['Yak', 'Dush', 'Sesh', 'Chor', 'Pay', 'Jum', 'Sha'];

/** "9-avgust" — doim Toshkent kalendar kuni (qurilma vaqt
    mintaqasidan qat'i nazar) — yarim tunga yaqin paytlarda
    boshqa mamlakatdan kirgan foydalanuvchiga noto'g'ri sana
    ko'rsatilib qolmasligi uchun. */
export function formatUzDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { day, month } = tashkentParts(d);
  return `${day}-${UZ_MONTHS[month - 1]}`;
}

/** "9-avgust, 20:00" — doim Toshkent vaqtida. */
export function formatUzDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const { hour, minute } = tashkentParts(d);
  const hh = String(hour).padStart(2, '0');
  const mm = String(minute).padStart(2, '0');
  return `${formatUzDate(d)}, ${hh}:${mm}`;
}

/** Hafta kunining qisqa nomi: "Dush" */
export function uzWeekday(date) {
  const d = date instanceof Date ? date : new Date(date);
  return UZ_WEEKDAYS[d.getDay()] ?? '';
}
