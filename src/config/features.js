/*
 * Vaqtinchalik funksiya yoqgichlari (kodni o'zgartirmasdan, bitta joydan).
 *
 * CARD_PAYMENT_ENABLED — savatda "Karta orqali" to'lov. false: tugma o'chirilgan (bosilmaydi), mijozga
 * "vaqtincha o'chirilgan, naqd to'lang" deb yozib turiladi. true: yoqilgan (2026-11 Click qayta yoqildi — pastdagi ro'yxat bo'yicha).
 */
export const CARD_PAYMENT_ENABLED = true;

/*
 * CARD_PROVIDERS_ALLOWED — savatda qaysi karta to'lov tizimlari ko'rsatilishi. Server `GET /payments/status` sozlangan HAMMA
 * provayderni qaytaradi (click, paynet, payme); mijozga faqat shu ro'yxatdagilari chiqadi. Hozir FAQAT Click:
 * Paynet to'lov summasi tuzatilmagan (server tz/paynet-som), Payme eskirgan. Boshqasini yoqish: nomini shu ro'yxatga qo'shing.
 */
export const CARD_PROVIDERS_ALLOWED = ['click'];

/** Serverdan kelgan provayderlar ro'yxatidan faqat ruxsat etilganlarini qoldiradi (sof funksiya — tests/cardProviders.test.mjs). */
export function filterCardProviders(list, allowed = CARD_PROVIDERS_ALLOWED) {
  return Array.isArray(list) ? list.filter((p) => allowed.includes(String(p?.name || '').toLowerCase())) : [];
}
