import { useEffect, useState } from 'react';
import { api } from '@/api';
import { useI18n } from '@/i18n';
import './GiftBonus.css';

/*
 * ═══ LOKMAGO SOVG'A-BONUSI (mijoz ilovasi) ═══
 * Buyurtma summasi shartdan oshsa taomga QO'SHIB bepul sovg'a (masalan 100 000 so'mdan 1 l Coca-Cola).
 *  • Savatda: sovg'a olingan bo'lsa yashil kartochka ("Bepul"), olinmagan bo'lsa — "yana X so'm" chizig'i.
 *  • Hisob serverda (POST /gift-bonus/quote): buyurtma yaratilishidagi bilan BIR XIL qoida. Bu yerdagi ko'rinish —
 *    va'da emas, tushuntirish: yakuniy qaror buyurtma yuborilganda serverda (limit/vaqt o'zgargan bo'lishi mumkin).
 *  • Server javob bermasa — blok ko'rinmaydi (savat va buyurtma bunga bog'liq emas).
 */
const TXT = {
  uz: { title: 'Sovg‘a sizga!', free: 'Bepul', add: 'Yana', addPost: 'so‘mlik taom qo‘shing — sovg‘a oling', paid: 'chegirmalardan keyin hisoblanadi', note: 'Restoran taomga qo‘shib beradi', gift: 'Sovg‘a' },
  uzc: { title: 'Совға сизга!', free: 'Бепул', add: 'Яна', addPost: 'сўмлик таом қўшинг — совға олинг', paid: 'чегирмалардан кейин ҳисобланади', note: 'Ресторан таомга қўшиб беради', gift: 'Совға' },
  ru: { title: 'Подарок вам!', free: 'Бесплатно', add: 'Добавьте ещё', addPost: 'сум — и получите подарок', paid: 'считается после скидок', note: 'Ресторан добавит к заказу', gift: 'Подарок' },
};
export const useGiftText = () => TXT[useI18n().lang] || TXT.uz;

const PAY = ['cash', 'click', 'payme', 'paynet', 'uzum'];
// Faqat raqam ("so'm" matnning o'zida bor): 24 000
const amount = (n) => Math.round(Number(n) || 0).toLocaleString('ru-RU').replace(/\u00a0/g, ' ');

/**
 * Savatdagi har restoran uchun sovg'a holati. Savat o'zgarganda (summa, usul) 350 ms kutib qayta so'raydi.
 * @returns { [restaurantId]: { gifts: [...], next: {...}|null } }
 */
export function useGiftQuote(perRestaurant, isPickup, paymentMethod) {
  const [data, setData] = useState({});
  const key = `${perRestaurant.map((r) => `${r.restaurant.id}:${r.subtotal}`).join('|')}|${isPickup ? 'p' : 'd'}|${paymentMethod || ''}`;
  useEffect(() => {
    if (!perRestaurant.length) { setData({}); return undefined; }
    let dead = false;
    const t = setTimeout(async () => {
      try {
        const r = await api.quoteGifts({
          groups: perRestaurant.map((x) => ({ restaurantId: String(x.restaurant.id), subtotal: Math.max(0, Math.round(x.subtotal)) })),
          fulfillment: isPickup ? 'pickup' : 'delivery',
          ...(PAY.includes(paymentMethod) ? { paymentMethod } : {}),
        });
        if (!dead) setData(Object.fromEntries((r?.groups || []).map((g) => [g.restaurantId, g])));
      } catch { if (!dead) setData({}); }
    }, 350);
    return () => { dead = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return data;
}

function Thumb({ url }) {
  return url
    ? <img className="gb__img" src={url} alt="" loading="lazy" />
    : <span className="gb__img gb__img--ph" aria-hidden="true">🎁</span>;
}

/** Savatdagi blok: restoranlar bo'yicha sovg'a yoki "yana X so'm" */
export function GiftBonusBanner({ perRestaurant, quote }) {
  const T = useGiftText();
  const multi = perRestaurant.length > 1;
  const rows = perRestaurant.map((r) => ({ r, q: quote[String(r.restaurant.id)] })).filter((x) => x.q && (x.q.gifts?.length || x.q.next));
  if (!rows.length) return null;
  return (
    <div className="gb" role="region" aria-label={T.gift}>
      {rows.map(({ r, q }) => (
        <div key={r.restaurant.id}>
          {q.gifts?.map((g) => (
            <div key={g.ruleId} className="gb__card gb__card--earned">
              <Thumb url={g.imageUrl} />
              <div className="gb__body">
                <div className="gb__title">🎁 {T.title}</div>
                <div className="gb__name">{g.quantity} × {g.itemName}</div>
                <div className="gb__sub">{multi ? `${r.restaurant.name} · ` : ''}{T.note}</div>
              </div>
              <span className="gb__free">{T.free}</span>
            </div>
          ))}
          {!q.gifts?.length && q.next && (() => {
            const n = q.next; const have = n.minAmount - n.missing; const pct = Math.max(4, Math.min(100, Math.round((have / n.minAmount) * 100)));
            return (
              <div className="gb__card gb__card--next">
                <Thumb url={n.imageUrl} />
                <div className="gb__body">
                  <div className="gb__title gb__title--next">{T.add} <b>{amount(n.missing)}</b> {T.addPost}</div>
                  <div className="gb__name">{n.quantity} × {n.itemName}{multi ? ` · ${r.restaurant.name}` : ''}</div>
                  <div className="gb__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
                  {n.basis === 'paid' && <div className="gb__sub">{T.paid}</div>}
                </div>
              </div>
            );
          })()}
        </div>
      ))}
    </div>
  );
}

/** Hisob qatori / buyurtma ro'yxati uchun: "🎁 1× 1 l Coca-Cola — Bepul" */
export function GiftLines({ items, className = '' }) {
  const T = useGiftText();
  if (!items?.length) return null;
  return items.map((g, i) => (
    <div key={i} className={`gb__line ${className}`}>
      <span className="gb__line-name">🎁 {g.quantity || 1}× {g.itemName}</span>
      <span className="gb__line-free">{T.free}</span>
    </div>
  ));
}
