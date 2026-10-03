import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { Icon } from '@/components/Icon';
import { useCart } from '@/store/cart';
import { useT } from '@/i18n';
import { api } from '@/api';
import { formatSom, formatSomShort } from '@/lib/utils';
import { freeDeliveryPromo } from '@/lib/freeDeliveryPromo';
import './cards/CartBar.css';

export function CartBar() {
  const navigate = useNavigate();
  const t = useT();
  const count = useCart((s) => s.totalCount());
  const total = useCart((s) => s.totalPrice());
  const items = useCart((s) => s.items);
  const restaurantGroups = useCart((s) => s.restaurantGroups);
  const visible = count > 0;

  // Savat paneli ko'ringanda yordam tugmasi yuqoriga ko'chsin (to'qnashmasin).
  // MUHIM: hook har doim chaqiriladi (early return'dan oldin) — Rules of Hooks.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--cart-bar-offset', visible ? '78px' : '0px');
    return () => root.style.setProperty('--cart-bar-offset', '0px');
  }, [visible]);

  /*
   * Bepul yetkazish chegarasi — HAR RESTORANNING O'Z sozlamasi (admin: "Bepul yetkazish
   * chegarasi"). Avval hamma uchun 100 000 qattiq yozilgan edi: chegarasi yo'q restoranda ham
   * "qo'lga kiritildi" chiqardi. Chegara 0/yo'q bo'lsa panel umuman ko'rinmaydi.
   *
   * Savatdagi nusxa eskirgan bo'lishi mumkin va u kilometrli rejim ma'lumotini saqlamaydi —
   * shuning uchun jonli restoran so'raladi (kalit restoran sahifasi bilan bir xil: kesh, ortiqcha
   * so'rov yo'q). Javob kelguncha savatdagi nusxa ishlatiladi (standart: chegara yo'q → panel yo'q).
   */
  // `items` bog'liqligi ATAYLAB: restaurantGroups() store ichidan get().items ni o'qiydi (CartPage ham shunday)
  const groups = useMemo(() => restaurantGroups(), [items, restaurantGroups]); // eslint-disable-line react-hooks/exhaustive-deps
  const ids = useMemo(() => [...new Set(groups.map((g) => g.restaurant.id))], [groups]);
  const live = useQueries({
    queries: ids.map((id) => ({
      queryKey: ['restaurant', id],
      queryFn: ({ signal }) => api.getRestaurant(id, { signal }),
      enabled: visible,
      staleTime: 60_000,   // savat paneli har sahifada turadi — har safar qayta so'ramaydi
    })),
  });
  const fresh = useMemo(() => {
    const map = {};
    live.forEach((q) => { if (q.data?._id) map[String(q.data._id)] = q.data; });
    return map;
  }, [live.map((q) => q.dataUpdatedAt).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const promo = useMemo(() => freeDeliveryPromo(groups, fresh), [groups, fresh]);

  if (!visible) return null;

  return (
    <>
      {/* Fixed panel kontentni yopmasligi uchun joy egallovchi bo'shliq */}
      <div className="cart-bar-spacer" aria-hidden="true" />
      <div className="cart-bar-wrap">
      {/* Bepul yetkazish progress — FAQAT restoranda chegara belgilangan bo'lsa */}
      {promo && (
        <div className="cart-bar-promo" data-testid="free-delivery-promo">
          {promo.reached ? (
            <span className="cart-bar-promo__free"><Icon name="gift" size={14} color="var(--success)" /> {t('freeDeliveryReached')}</span>
          ) : (
            <span className="cart-bar-promo__text">
              {promo.name ? `${promo.name}: ` : ''}{t('freeDeliveryLeft')} <b>{formatSomShort(promo.remaining)} {t('som')}</b>
            </span>
          )}
          <div className="cart-bar-promo__bar">
            <div className="cart-bar-promo__fill" style={{ width: `${promo.progress}%` }} />
          </div>
        </div>
      )}

      <button onClick={() => navigate('/cart')} className="cart-bar">
        <span className="cart-bar__count">{count}</span>
        <span className="cart-bar__label">{t('goToCart')}</span>
        <span className="cart-bar__total">{formatSom(total)}</span>
      </button>
      </div>
    </>
  );
}
