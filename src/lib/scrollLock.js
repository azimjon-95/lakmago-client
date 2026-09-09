/*
 * Yagona orqa-fon scroll qulfi (ref-count).
 *
 * NIMA UCHUN KERAK
 * ────────────────
 * Bir nechta modal/sheet mustaqil ravishda body/html overflow
 * yoki position:fixed qo'yib, "oldingi" qiymatni o'zida saqlardi.
 * Ular ketma-ket yoki birga ochilganda prev qiymat allaqachon
 * "hidden" bo'lib qolardi — yopilganda ham overflow: hidden
 * qolib, sahifa scroll qotib qolardi. Refresh yordamida
 * tozalangani shundan.
 *
 * YECHIM
 * ──────
 * Bitta hisoblagich: birinchi lock stilni qo'yadi va asl
 * qiymatlarni eslab qoladi; oxirgi unlock asl holatga qaytaradi.
 * Oradagi lock/unlock stilni umuman o'zgartirmaydi.
 *
 * iOS Safari uchun position:fixed + top:-scrollY ishlatiladi —
 * oddiy overflow:hidden yetarli emas.
 */

let lockCount = 0;
let saved = null;

export function lockScroll() {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    saved = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      scrollY,
    };

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
  }

  lockCount += 1;
}

export function unlockScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;

  lockCount -= 1;

  if (lockCount === 0 && saved) {
    const html = document.documentElement;
    const body = document.body;
    const { htmlOverflow, bodyOverflow, bodyPosition, bodyTop, bodyWidth, scrollY } = saved;

    html.style.overflow = htmlOverflow;
    body.style.overflow = bodyOverflow;
    body.style.position = bodyPosition;
    body.style.top = bodyTop;
    body.style.width = bodyWidth;

    window.scrollTo(0, scrollY);
    saved = null;
  }
}