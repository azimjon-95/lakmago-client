import { useEffect, useRef } from 'react';
import { useCart } from '@/store/cart';
import { useOpenStatus } from '@/hooks/useOpenStatus';
import { isOpenNow } from '@/lib/workHours';
import { api } from '@/api';

/**
 * Savatni avtomatik tozalaydi.
 *
 * Mijoz taom qo'shib ketib, ancha vaqtdan keyin qaytishi
 * mumkin — bu vaqtda restoran yopilgan bo'lishi mumkin.
 *
 * Ikki bosqich:
 *  1. Savatdagi ish vaqtiga qarab (darhol, so'rovsiz)
 *  2. Serverdan tekshirish (ish vaqti o'zgargan bo'lishi mumkin)
 */
export function useCartCleanup(onRemoved) {
  const items = useCart((s) => s.items);
  const removeRestaurant = useCart((s) => s.removeRestaurant);
  const restaurantGroups = useCart((s) => s.restaurantGroups);
  const checked = useRef(new Set());

  // ─── 1. Mahalliy tekshiruv ───
  // useOpenStatus daqiqada bir marta qayta hisoblaydi
  const { isOpen: _tick } = useOpenStatus({});

  useEffect(() => {
    if (!items.length) return;

    const groups = restaurantGroups();
    const closed = groups.filter((g) => {
      const { openTime, closeTime } = g.restaurant;
      // Ish vaqti ma'lum bo'lsa tekshiramiz
      if (!openTime || !closeTime) return false;
      return !isOpenNow({ openTime, closeTime });
    });

    for (const g of closed) {
      removeRestaurant(g.restaurant.id);
      onRemoved?.(g.restaurant.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, _tick]);

  // ─── 2. Serverdan tekshirish ───
  // Ish vaqti admin tomonidan o'zgartirilgan bo'lishi mumkin
  useEffect(() => {
    if (!items.length) return;

    const groups = restaurantGroups();
    const toCheck = groups
      .map((g) => g.restaurant.id)
      .filter((id) => id && !checked.current.has(id));

    if (!toCheck.length) return;

    for (const id of toCheck) {
      checked.current.add(id);

      api.getRestaurant(id)
        .then((r) => {
          if (!r) return;

          // Restoran o'chirilgan yoki bloklangan
          const unavailable = r.isActive === false || r.isBlocked === true;
          const closed = r.openTime && r.closeTime
            && !isOpenNow({ openTime: r.openTime, closeTime: r.closeTime });

          if (unavailable || closed) {
            removeRestaurant(id);
            onRemoved?.(r.name);
          }
        })
        .catch(() => {
          // Restoran topilmadi — savatdan olib tashlaymiz
          removeRestaurant(id);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);
}
