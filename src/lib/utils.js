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

/** "9-avgust" */
export function formatUzDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()}-${UZ_MONTHS[d.getMonth()]}`;
}

/** "9-avgust, 20:00" */
export function formatUzDateTime(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${formatUzDate(d)}, ${hh}:${mm}`;
}

/** Hafta kunining qisqa nomi: "Dush" */
export function uzWeekday(date) {
  const d = date instanceof Date ? date : new Date(date);
  return UZ_WEEKDAYS[d.getDay()] ?? '';
}
