import { deliveryTerms } from '@/lib/deliveryInfo';

/*
 * "Bepul yetkazishgacha ..." paneli (Savatga o'tish tugmasi tepasida) uchun hisob.
 *
 * AVVAL panel hamma restoran uchun QATTIQ KODLANGAN 100 000 so'mga qarab ishlardi: chegarasi
 * yo'q restoranda ham "Bepul yetkazish qo'lga kiritildi!" chiqardi. Endi har restoranning O'Z
 * chegarasi (admin: "Bepul yetkazish chegarasi") ishlatiladi:
 *   • 0 / belgilanmagan  → panel umuman KO'RINMAYDI (null) — standart holat;
 *   • chegara bor        → shu summaga qarab: qancha qoldi yoki "qo'lga kiritildi".
 *
 * Qoida savat sahifasi/serverdagi bilan bir xil (lib/deliveryInfo.js deliveryTerms):
 *   • yetkazish o'chirilgan restoranda chegara yo'q;
 *   • oddiy narxda chegara faqat yetkazish PULLIK bo'lsa mantiqli (bepul bo'lsa — yo'q);
 *   • kilometrli rejimda chegara har doim amal qiladi.
 *
 * Bir nechta restoran: faqat chegarasi bor restoranlar hisobga olinadi; hali yetmaganlari
 * orasidan ENG YAQINI ko'rsatiladi (savatdagi gapToFree bilan bir xil); hammasi yetgan bo'lsa —
 * "qo'lga kiritildi".
 *
 * @param groups  restaurantGroups(): [{ restaurant, subtotal, items }]
 * @param fresh   { [restaurantId]: jonli restoran } — savatdagi nusxadan USTUN (u eskirgan bo'lishi mumkin)
 * @returns {null | { reached: boolean, remaining: number, progress: number, name: string|null }}
 */
export function freeDeliveryPromo(groups, fresh = {}) {
  const list = [];
  for (const g of groups || []) {
    const live = fresh[g.restaurant?.id];
    const rest = live ? { ...g.restaurant, ...live } : g.restaurant;
    const threshold = Number(deliveryTerms(rest).threshold) || 0;
    if (threshold <= 0) continue;
    const sub = g.subtotal ?? (g.items || []).reduce((s, it) => s + it.unitPrice * it.quantity, 0);
    list.push({ name: rest?.name || null, sub, threshold });
  }
  if (list.length === 0) return null;

  const open = list.filter((c) => c.sub < c.threshold);
  if (open.length === 0) return { reached: true, remaining: 0, progress: 100, name: null };

  const nearest = open.reduce((a, b) => (b.threshold - b.sub < a.threshold - a.sub ? b : a));
  return {
    reached: false,
    remaining: nearest.threshold - nearest.sub,
    progress: Math.max(0, Math.min(100, (nearest.sub / nearest.threshold) * 100)),
    // Bir nechta restoran bo'lsa qaysi biriga tegishli ekani aytiladi
    name: list.length > 1 ? nearest.name : null,
  };
}
