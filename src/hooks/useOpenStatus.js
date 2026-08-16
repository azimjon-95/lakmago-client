import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { isOpenNow, workHoursLabel, nextOpenLabel } from '@/lib/workHours';
import { api } from '@/api';

/**
 * Ish vaqti nazorati — YAGONA manba.
 *
 * Muammolar va yechimlar:
 *
 * 1. Client soati noto'g'ri bo'lishi mumkin → server bilan
 *    farqni bir marta o'lchaymiz va shu tuzatish bilan ishlaymiz.
 *
 * 2. Ish vaqti tugaganda sahifa o'zi yangilanishi kerak →
 *    daqiqada bir marta tekshiramiz. API so'rov YUBORILMAYDI,
 *    faqat mahalliy hisob.
 *
 * 3. Har komponent o'z taymerini yaratsa resurs isrof bo'ladi →
 *    bitta umumiy taymer, barcha komponentlar unga obuna.
 */

// ===== Umumiy holat =====
let serverOffset = 0;        // server_vaqti − client_vaqti (ms)
let offsetLoaded = false;
let tickListeners = new Set();
let timerId = null;

/** Hozirgi vaqt — server bilan tuzatilgan. */
export function serverNow() {
  return new Date(Date.now() + serverOffset);
}

/** Server bilan farqni bir marta o'lchaymiz. */
async function syncTime() {
  if (offsetLoaded) return;
  offsetLoaded = true;
  try {
    const t0 = Date.now();
    const { now } = await api.getServerTime();
    // Tarmoq kechikishining yarmini hisobga olamiz
    const latency = (Date.now() - t0) / 2;
    serverOffset = now + latency - Date.now();
  } catch {
    serverOffset = 0; // Server javob bermasa client soatiga tayanamiz
  }
  notify();
}

function notify() {
  tickListeners.forEach((fn) => fn());
}

/** Daqiqa boshida ishga tushadigan taymer. */
function startTimer() {
  if (timerId) return;

  const schedule = () => {
    const now = serverNow();
    // Keyingi daqiqa boshigacha qancha qolgan
    const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    timerId = setTimeout(() => {
      notify();
      timerId = null;
      if (tickListeners.size > 0) schedule();
    }, Math.max(1000, msToNextMinute));
  };
  schedule();
}

function subscribe(fn) {
  tickListeners.add(fn);
  syncTime();
  startTimer();

  return () => {
    tickListeners.delete(fn);
    if (tickListeners.size === 0 && timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };
}

// Har daqiqada o'zgaradigan "snapshot" — daqiqa raqami
function getSnapshot() {
  return Math.floor((Date.now() + serverOffset) / 60000);
}

/**
 * Restoran hozir ochiqmi.
 * Daqiqa o'tganda avtomatik qayta hisoblanadi.
 *
 * @param {object} source - restoran yoki taom (restaurantOpenTime bilan)
 */
export function useOpenStatus(source) {
  // Daqiqa o'zgarganda komponent qayta render bo'ladi
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Taom bo'lsa restaurantOpenTime, restoran bo'lsa openTime
  const hours = {
    openTime: source?.openTime ?? source?.restaurantOpenTime ?? '',
    closeTime: source?.closeTime ?? source?.restaurantCloseTime ?? '',
  };

  const now = serverNow();
  const localIsOpen = isOpenNow(hours, now);

  /*
   * Server /restaurants javobida tayyor `isOpen` maydonini
   * beradi (services/restaurantTime.js orqali) — bu ish
   * kunlari (workingDays) va restoranning o'z vaqt mintaqasini
   * ham hisobga oladi, mijozdagi soddaroq hisob esa faqat
   * soat/daqiqani biladi.
   *
   * Shuning uchun: server aniq "YOPIQ" (false) desa — DARHOL
   * shunga ishonamiz (masalan bugun dam olish kuni bo'lishi
   * mumkin, buni mijoz bilmaydi). Server "OCHIQ" desa yoki
   * umuman bermagan bo'lsa (eski keshlangan ma'lumot) — mijoz
   * o'zi har daqiqada jonli hisoblagan natijasiga tayanamiz,
   * shunda soat aynan yopilish daqiqasida ham darhol yangilanadi
   * (server javobini qayta so'ramasdan).
   */
  const isOpen = source?.isOpen === false ? false : localIsOpen;

  return {
    isOpen,
    hoursLabel: workHoursLabel(hours),
    nextOpen: nextOpenLabel(hours, now),
    openTime: hours.openTime,
    closeTime: hours.closeTime,
  };
}

/**
 * Yopiq restoran taomlarini ro'yxatdan chiqaradi.
 * Daqiqa o'tganda avtomatik qayta filtrlanadi.
 */
export function useOpenDishes(dishes) {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const now = serverNow();
  return (dishes || []).filter((d) => {
    // Ish vaqti ko'rsatilmagan bo'lsa — doim ochiq
    const open = d.restaurantOpenTime || d.restaurant?.openTime;
    const close = d.restaurantCloseTime || d.restaurant?.closeTime;
    if (!open || !close) return true;
    return isOpenNow({ openTime: open, closeTime: close }, now);
  });
}

/**
 * "Restoran yopiq" ogohlantirishini boshqaradi.
 * Bir joyda saqlanadi — har komponent o'zi yaratmasin.
 */
export function useClosedAlert() {
  const [closedInfo, setClosedInfo] = useState(null);

  const showClosed = useCallback((info) => {
    setClosedInfo(info || {});
  }, []);

  const hideClosed = useCallback(() => setClosedInfo(null), []);

  // Escape bilan yopish
  useEffect(() => {
    if (!closedInfo) return;
    const onKey = (e) => e.key === 'Escape' && hideClosed();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closedInfo, hideClosed]);

  return { closedInfo, showClosed, hideClosed };
}
