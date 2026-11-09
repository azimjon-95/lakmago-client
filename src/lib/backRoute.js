/*
 * ═══ "ORQAGA" QOIDASI — yagona manba (sof funksiyalar, hech narsaga bog'liq emas) ═══
 * Telegram "Назад" tugmasi va sahifalardagi orqaga o'qlari SHU qoidadan foydalanadi (hooks/useBack.js).
 *
 * Nega brauzer tarixiga (navigate(-1)) bir o'zi ishonib bo'lmaydi:
 *   • havola orqali kirilganda (startapp=rest_…) sahifa `replace` bilan ochiladi — tarixda qaytadigan joy YO'Q;
 *   • Market / To'yxonalar bo'limi birinchi ochilgan sahifa bo'lishi mumkin;
 *   • bo'lim `market` bo'lib qolsa, `/` ga qaytilganda bosh sahifa qaytib `/market` ga sakraydi.
 *
 * Qoida:
 *   /market, /weddings*            → Lokma Go (`/`), bo'lim `go` ga o'tadi
 *   /market/products               → /market
 *   /restaurant/:id/reserve        → shu restoran sahifasi
 *   /restaurant/:id (restoran/do'kon) → ro'yxat sahifasidan kelingan bo'lsa orqaga; aks holda O'Z BO'LIMINING bosh sahifasi
 *   boshqa sahifalar               → tarix bo'lsa orqaga; aks holda bo'lim bosh sahifasi
 *   /                              → yopish (Telegram yoki tizim)
 */
export const homeOf = (section) => (section === 'market' ? '/market' : '/');

// Restoran/do'kon sahifasidan orqaga "tabiiy" qaytiladigan ro'yxat sahifalari
const LIST_PAGE = /^\/($|market$|market\/products$|search$|favorites$|orders$|profile$|discover\/)/;

function explicitParent(pathname) {
  if (pathname === '/market') return { to: '/', section: 'go' };
  if (pathname === '/market/products') return { to: '/market', section: 'market' };
  if (pathname === '/weddings' || pathname.startsWith('/weddings/')) return { to: '/', section: 'go' };
  const rsv = /^\/restaurant\/([^/]+)\/reserve$/.exec(pathname);
  if (rsv) return { to: `/restaurant/${rsv[1]}` };
  return null;
}

/**
 * @param {{pathname:string, prev:string|null, section:'go'|'market'}} p
 *   prev — tarixdagi oldingi ILOVA ichidagi sahifa (yo'q bo'lsa null: havola/yangi ochilish)
 * @returns {{action:'close'} | {action:'history', section?:string} | {action:'replace', to:string, section?:string}}
 */
export function resolveBack({ pathname, prev, section }) {
  if (pathname === '/') return { action: 'close' };

  const ex = explicitParent(pathname);
  if (ex) {
    return prev === ex.to
      ? { action: 'history', section: ex.section }
      : { action: 'replace', to: ex.to, section: ex.section };
  }

  // Restoran / do'kon: faqat ro'yxat sahifasidan kelingan bo'lsa orqaga (bron/taom/savat tarixi chalkashmasin)
  if (/^\/restaurant\/[^/]+$/.test(pathname)) {
    return prev && LIST_PAGE.test(prev)
      ? { action: 'history' }
      : { action: 'replace', to: homeOf(section) };
  }

  // Qolgan sahifalar (taom, savat, qidiruv, buyurtmalar, profil ...)
  return prev ? { action: 'history' } : { action: 'replace', to: homeOf(section) };
}
