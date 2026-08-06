/**
 * Dine-in sessiyasi — brauzer tomonda saqlash.
 *
 * MUHIM: qurilma identifikatori (IMEI, seriya) OLINMAYDI.
 * deviceSessionId — brauzerda yaratiladigan tasodifiy qiymat,
 * faqat shu qurilmaning sessiyasini tanish uchun.
 */

const DEVICE_KEY = 'lokma_device_id';
const SESSION_KEY = 'lokma_dinein';

/** Qurilma uchun tasodifiy ID — bir marta yaratiladi. */
export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = `dev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    // localStorage yopiq bo'lsa ham menyu ochilishi kerak
    return `tmp_${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Faol sessiyani saqlaydi. */
export function saveSession(data) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
  } catch { /* muhim emas */ }
}

/** Saqlangan sessiyani o'qiydi. */
export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* muhim emas */ }
}
