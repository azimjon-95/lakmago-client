import { useCallback, useRef, useState } from 'react';

/*
 * ═══════════════════════════════════════════════════════════
 * PASTGA TORTIB YOPISH (swipe to dismiss)
 * ═══════════════════════════════════════════════════════════
 *
 * Telefon ilovalaridagi odatiy xulq: pastdan chiqadigan oynani
 * barmoq bilan pastga tortib yopish.
 *
 * ─── ASOSIY TALAB: TASODIFAN YOPILMASLIK ───
 * Oynaga shunchaki tegish yoki ichidagi ro'yxatni aylantirish
 * uni YOPMASLIGI kerak. Shuning uchun uchta shart:
 *
 *   1. Harakat PASTGA bo'lishi kerak (dy > 0)
 *   2. Ichki aylanadigan blok TEPADA turishi kerak — aks holda
 *      mijoz ro'yxatni aylantiryapti, oynani tortmayapti
 *   3. Gorizontal siljish bo'lsa aralashmaymiz (karusellar)
 *
 * ─── YOPILISH QARORI ───
 * Ikki mezondan biri yetarli:
 *   • uzoq tortildi (balandlikning ~30% dan ko'p), YOKI
 *   • tez tortildi (tezlik yuqori) — "otib yuborish" harakati
 *
 * Ikkinchisi muhim: tajribali foydalanuvchi oynani qisqa,
 * lekin tez harakat bilan yopadi. Faqat masofaga qarasak,
 * bunday harakat ishlamay, ilova "og'ir" his qilinardi.
 */

// Yopish uchun kerakli masofa — panel balandligiga nisbatan
const CLOSE_RATIO = 0.3;
// Yoki shu tezlikdan yuqori (px/ms)
const CLOSE_VELOCITY = 0.55;
// Qaytish animatsiyasi
const SPRING = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
// Yopilish animatsiyasi — biroz tezroq, kutish hissi bo'lmasin
const EXIT = 'transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 220ms ease';

export function useSheetDrag(onClose) {
  const panelRef = useRef(null);
  const start = useRef(null);
  const [dy, setDy] = useState(0);
  const [closing, setClosing] = useState(false);

  /*
   * Barmoq ostidagi element aylanadigan blok ichidami va u
   * tepada turibdimi. Agar ro'yxat o'rtasida bo'lsa, mijoz
   * aylantiryapti — oynaga tegmaymiz.
   */
  const scrollAtTop = (target) => {
    let el = target;
    while (el && el !== panelRef.current) {
      if (el.scrollHeight > el.clientHeight) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === 'auto' || oy === 'scroll') return el.scrollTop <= 0;
      }
      el = el.parentElement;
    }
    return true;
  };

  const onTouchStart = useCallback((e) => {
    if (closing || e.touches.length !== 1) return;
    const t = e.touches[0];
    start.current = {
      x: t.clientX,
      y: t.clientY,
      time: Date.now(),
      // Boshlanish paytidagi holat eslab qolinadi: keyin
      // aylantirish boshlansa ham qaror o'zgarmaydi
      allowed: scrollAtTop(e.target),
      decided: false,
      dragging: false,
    };
  }, [closing]);

  const onTouchMove = useCallback((e) => {
    const s = start.current;
    if (!s || !s.allowed || closing) return;

    const t = e.touches[0];
    const deltaY = t.clientY - s.y;
    const deltaX = t.clientX - s.x;

    /*
     * Yo'nalish BIR MARTA hal qilinadi, keyin o'zgarmaydi.
     * Aks holda diagonal harakatda oyna "sakrab" turardi.
     */
    if (!s.decided) {
      if (Math.abs(deltaY) < 6 && Math.abs(deltaX) < 6) return;
      s.decided = true;
      s.dragging = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX);
    }
    if (!s.dragging) return;

    if (e.cancelable) e.preventDefault();

    /*
     * Qarshilik: tepaga tortishga yo'l qo'ymaymiz, pastga esa
     * to'liq ergashamiz. Bu oynaning "og'irligi" hissini beradi.
     */
    setDy(Math.max(0, deltaY));
  }, [closing]);

  const onTouchEnd = useCallback(() => {
    const s = start.current;
    start.current = null;
    if (!s || !s.dragging || closing) { setDy(0); return; }

    const panel = panelRef.current;
    const height = panel?.offsetHeight || 400;
    const elapsed = Math.max(1, Date.now() - s.time);
    const velocity = dy / elapsed;

    if (dy > height * CLOSE_RATIO || velocity > CLOSE_VELOCITY) {
      // Yopamiz: avval pastga surib yuboramiz, keyin onClose
      setClosing(true);
      setDy(height);
      // Animatsiya tugagach — sakrash bo'lmasin
      setTimeout(() => onClose?.(), 200);
    } else {
      setDy(0);
    }
  }, [dy, closing, onClose]);

  return {
    panelRef,
    /*
     * Panelga o'rnatiladigan xossalar.
     * touchAction: 'pan-y' — vertikal harakatni biz olamiz,
     * lekin brauzerning o'z aylantirishi ham ishlashda davom
     * etadi (ro'yxat o'rtasida bo'lsak).
     */
    dragProps: {
      ref: panelRef,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      onTouchCancel: onTouchEnd,
      style: {
        transform: dy ? `translateY(${dy}px)` : undefined,
        transition: start.current ? 'none' : (closing ? EXIT : SPRING),
        opacity: closing ? 0.6 : undefined,
        touchAction: 'pan-y',
      },
    },
    // Fon qorayishi ham tortishga ergashsin — bir butun his
    overlayStyle: {
      transition: closing ? 'opacity 220ms ease' : 'opacity 160ms ease',
      opacity: closing ? 0 : undefined,
    },
    closing,
  };
}
