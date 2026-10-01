/*
 * ═══════════════════════════════════════════════════════════
 * "BARCHA RESTORANLAR": PIN QILINGAN RESTORANLAR (1, 2, 3-O'RIN)
 * ═══════════════════════════════════════════════════════════
 *
 * Server /restaurants javobida faol pin qo'yilgan restoranga
 * `pin: { position: 1|2|3, endsAt }` qo'shadi (admin: Mijoz jalb qilish →
 * Top joylar). Qolgan restoranlar mijozning tasodifiy (seed bilan aralashtirilgan)
 * tartibida qoladi — pinlar faqat o'z o'rniga chiqadi.
 *
 * Sof funksiyalar: bazasiz, tarmoqsiz, testlanadi.
 */

/**
 * Restoranning FAOL pini (yoki null). `endsAt` mijozda ham tekshiriladi:
 * ilova uzoq ochiq tursa yoki ro'yxat keshlangan bo'lsa, muddati tugagan pin
 * server yangilanishini kutmasdan o'zi yo'qoladi.
 */
export function activePin(r, now = Date.now()) {
  const p = r?.pin;
  if (!p || ![1, 2, 3].includes(p.position)) return null;
  const end = p.endsAt ? new Date(p.endsAt).getTime() : NaN;
  if (Number.isFinite(end) && end <= now) return null;
  return p;
}

/**
 * Pin qo'yilganlarni O'Z O'RNIGA qo'yadi: pin 1 → 1-o'rin (indeks 0), 2 → 2-o'rin,
 * 3 → 3-o'rin; qolgan o'rinlar `shuffled` dagi (allaqachon aralashtirilgan)
 * pinsiz restoranlar bilan, o'z tartibida to'ladi.
 *
 *  • 1-o'rin bo'sh, 2-o'rinda pin bo'lsa — pin baribir 2-o'rinda (1-o'rinda tasodifiy).
 *  • Ro'yxat pindan qisqa bo'lsa (masalan, kategoriya filtri) — pin oxirgi bo'sh joyga.
 *  • Pinli restoran filtrga tushmagan bo'lsa (ro'yxatda yo'q) — hech narsa qo'shilmaydi.
 *  • Pin yo'q bo'lsa — kirish massivi AYNAN o'sha tartibda (yangi massiv, mazmun bir xil).
 */
export function placePinned(shuffled, now = Date.now()) {
  const list = Array.isArray(shuffled) ? shuffled : [];
  const pinned = new Map();                 // position → restoran (har o'rinda bittadan)
  for (const r of list) {
    const p = activePin(r, now);
    if (p && !pinned.has(p.position)) pinned.set(p.position, r);
  }
  if (!pinned.size) return [...list];

  const placed = new Set(pinned.values());
  const rest = list.filter((r) => !placed.has(r));
  const out = [];
  const total = list.length;
  for (let i = 0; i < total; i++) {
    const pin = pinned.get(i + 1);
    out.push(pin || rest.shift());
  }
  // Ro'yxat pin o'rnidan qisqa bo'lsa (nadir) — joylashmay qolganlari oxiriga
  for (const [pos, r] of pinned) if (pos > total && !out.includes(r)) out.push(r);
  return out.filter(Boolean);
}
