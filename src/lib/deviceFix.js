/*
 * Buyurtma bilan SERVERGA yuboriladigan "qurilma qayerda" dalili (services/deviceCheck.js server tomonda baholaydi).
 * Faqat YANGI nuqta (≤ 15 daqiqa) yuboriladi — eski nuqta "mijoz hozir shu yerda" degan yolg'on dalil bo'lib qolmasin.
 * confirmedFar — mijoz uzoq manzilni AYNAN o'zi tasdiqlagan ("Ha, u yerda kutib olishadi") yoki bir martalik manzilni o'zi tanlagan.
 */
export const DEVICE_FIX_MAX_AGE_MS = 15 * 60 * 1000;
const r6 = (n) => Math.round(n * 1e6) / 1e6;

export function buildDeviceFields({ fix, confirmedFar = false, now = Date.now() } = {}) {
  const base = confirmedFar ? { addressConfirmedFar: true } : {};
  if (!fix || !Number.isFinite(fix.lat) || !Number.isFinite(fix.lng) || (fix.lat === 0 && fix.lng === 0)) return base;
  const age = now - Number(fix.at || 0);
  if (!(age >= 0) || age > DEVICE_FIX_MAX_AGE_MS) return base;
  return {
    deviceLat: r6(fix.lat),
    deviceLng: r6(fix.lng),
    ...(Number.isFinite(fix.accuracy) ? { deviceAccuracy: Math.round(fix.accuracy) } : {}),
    deviceAt: new Date(fix.at).toISOString(),
    ...base,
  };
}
