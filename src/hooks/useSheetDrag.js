import { useCallback, useEffect, useRef, useState } from 'react';

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
 *   1. Harakat PASTGA bo'lishi kerak
 *   2. Aylanadigan blok TEPADA turishi kerak — aks holda mijoz
 *      ro'yxatni aylantiryapti, oynani tortmayapti
 *   3. Gorizontal siljish bo'lsa aralashmaymiz (karusellar)
 *
 * ─── YOPILISH QARORI ───
 * Ikki mezondan biri yetarli:
 *   • uzoq tortildi (balandlikning ~30% dan ko'p), YOKI
 *   • tez tortildi — "otib yuborish" harakati
 *
 * Ikkinchisi muhim: tajribali foydalanuvchi oynani qisqa,
 * lekin tez harakat bilan yopadi. Faqat masofaga qarasak,
 * bunday harakat ishlamay ilova "og'ir" his qilinardi.
 */

const CLOSE_RATIO = 0.3;          // panel balandligiga nisbatan
const CLOSE_VELOCITY = 0.55;      // px/ms
const SPRING = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
const EXIT = 'transform 220ms cubic-bezier(0.4, 0, 1, 1), opacity 220ms ease';

export function useSheetDrag(onClose) {
  const panelRef = useRef(null);
  const start = useRef(null);
  const [dy, setDy] = useState(0);
  const [closing, setClosing] = useState(false);

  // Eng so'nggi qiymatlar — listener'lar qayta biriktirilmasligi uchun
  const state = useRef({ dy: 0, closing: false, onClose });
  state.current = { dy, closing, onClose };

  /*
   * ═══ ORQA FON AYLANMASIN ═══
   *
   * Oyna ochiq turganda ortidagi sahifa aylanardi: mijoz oyna
   * ichida aylantirmoqchi bo'ladi, u tugagach harakat ostidagi
   * sahifaga o'tib ketardi. Oyna yopilgach mijoz butunlay
   * boshqa joyda turardi.
   *
   * Avvalgi qiymat aniq tiklanadi — boshqa joyda o'rnatilgan
   * uslub buzilmasligi uchun.
   */
  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  /*
   * Barmoq ostidagi aylanadigan blok tepadami.
   *
   * DIQQAT: panelning O'ZI ham tekshiriladi. Ko'p oynalarda
   * aynan panel aylanadigan konteyner bo'ladi (max-height +
   * overflow-y). Uni tekshirmasak, mijoz ro'yxat o'rtasida
   * turib pastga tortganda oyna yopilib ketardi.
   */
  const scrollAtTop = useCallback((target) => {
    const panel = panelRef.current;
    let el = target;
    while (el) {
      if (el.scrollHeight > el.clientHeight) {
        const oy = getComputedStyle(el).overflowY;
        if (oy === 'auto' || oy === 'scroll') return el.scrollTop <= 0;
      }
      if (el === panel) break;
      el = el.parentElement;
    }
    return true;
  }, []);

  /*
   * ═══ NIMA UCHUN NATIV LISTENER, React onTouchMove EMAS ═══
   *
   * React touchmove'ni ko'p brauzerlarda PASSIV rejimda
   * biriktiradi. Passiv listener ichida `e.preventDefault()`
   * E'TIBORSIZ qoldiriladi.
   *
   * Natijada oyna barmoq ortidan surilar, LEKIN ayni paytda
   * sahifa ham aylanardi — ikkalasi bir vaqtda harakatlanib,
   * tortish "sirpanchiq" his qilinardi.
   *
   * touchstart/touchend passiv qolaveradi: ular preventDefault
   * chaqirmaydi va passiv holat tezroq ishlaydi.
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;

    const onStart = (e) => {
      if (state.current.closing || e.touches.length !== 1) return;
      const t = e.touches[0];
      start.current = {
        x: t.clientX,
        y: t.clientY,
        time: Date.now(),
        allowed: scrollAtTop(e.target),
        decided: false,
        dragging: false,
      };
    };

    const onMove = (e) => {
      const s = start.current;
      if (!s || !s.allowed || state.current.closing) return;
      if (e.touches.length !== 1) return;

      const t = e.touches[0];
      const deltaY = t.clientY - s.y;
      const deltaX = t.clientX - s.x;

      /*
       * Yo'nalish BIR MARTA hal qilinadi va keyin o'zgarmaydi.
       * Aks holda diagonal harakatda oyna "sakrab" turardi.
       */
      if (!s.decided) {
        if (Math.abs(deltaY) < 6 && Math.abs(deltaX) < 6) return;
        s.decided = true;
        s.dragging = deltaY > 0 && Math.abs(deltaY) > Math.abs(deltaX);
      }
      if (!s.dragging) return;

      if (e.cancelable) e.preventDefault();
      // Tepaga tortishga yo'l qo'ymaymiz, pastga to'liq ergashamiz
      setDy(Math.max(0, deltaY));
    };

    const onEnd = () => {
      const s = start.current;
      start.current = null;
      const cur = state.current;
      if (!s || !s.dragging || cur.closing) { setDy(0); return; }

      const height = panel.offsetHeight || 400;
      const elapsed = Math.max(1, Date.now() - s.time);
      const velocity = cur.dy / elapsed;

      if (cur.dy > height * CLOSE_RATIO || velocity > CLOSE_VELOCITY) {
        setClosing(true);
        setDy(height);
        // Animatsiya tugagach yopamiz — sakrash bo'lmasin
        setTimeout(() => cur.onClose?.(), 200);
      } else {
        setDy(0);
      }
    };

    panel.addEventListener('touchstart', onStart, { passive: true });
    panel.addEventListener('touchmove', onMove, { passive: false });
    panel.addEventListener('touchend', onEnd, { passive: true });
    panel.addEventListener('touchcancel', onEnd, { passive: true });

    return () => {
      panel.removeEventListener('touchstart', onStart);
      panel.removeEventListener('touchmove', onMove);
      panel.removeEventListener('touchend', onEnd);
      panel.removeEventListener('touchcancel', onEnd);
    };
  }, [scrollAtTop]);

  return {
    panelRef,
    dragProps: {
      ref: panelRef,
      style: {
        transform: dy ? `translateY(${dy}px)` : undefined,
        // Tortish davomida animatsiya YO'Q — barmoqqa aniq ergashsin
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
