import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/store/user';
import { useSection } from '@/store/section';
import { useWeddingFrame } from '@/store/weddingFrame';
import { useI18n } from '@/i18n';
import { useFeatures } from '@/hooks/queries';
import { api } from '@/api';
import { getTelegram, haptic } from '@/lib/telegram';
import './WeddingHost.css';

/*
 * ═══ LOKMA TO'YXONALARI — Lokma Go ICHIDA (doimiy iframe) ═══
 *
 * To'yxonalar — alohida sayt (wedding.lokma.uz, alohida server), lekin mijoz
 * buni sezmasligi kerak:
 *   • iframe Lokma ochilgach FONDA isitiladi (bosh sahifa bo'sh turganda) —
 *     to'yxonalar sahifasi ochilganda darhol ko'rinadi, ro'yxat tayyor;
 *   • foydalanuvchi, manzillar va TIL ko'prik orqali uzatiladi; Lokma'da
 *     o'zgarsa (til, manzil, profil) darhol yangilanadi;
 *   • profil amallari (ism, telefon, manzil, til, taklif) va "Bronlarim" ota
 *     ilova orqali bajariladi — tokenlar iframe'ga HECH QACHON berilmaydi.
 *
 * Xabarlar (postMessage), ikki tomonda ham manzil (origin) qat'iy tekshiriladi:
 *   sayt → 'lokma-wedding:ready'         tayyor; caps: ['edge-to-edge'] — sayt tepadagi
 *                                        bo'shliqni o'zi hisobga oladi (iframe ekran tepasidan)
 *   biz  → 'lokma-wedding:context'       ism, telefon, manzillar, til (FAQAT wedding.lokma.uz ga)
 *   biz  → 'lokma-wedding:visible'       ko'rinish holati (GPS faqat ko'ringanda so'raladi)
 *   biz  → 'lokma-wedding:open'          sahifaga o'tish (chuqur havola)
 *   sayt → 'lokma-wedding:navigate'      Lokma Go ('/') yoki Market ('/market')
 *   sayt → 'lokma-wedding:rpc'           amal so'rovi; javob: 'lokma-wedding:rpc-result'
 *   sayt → 'lokma-wedding:route'         { canGoBack } — ichkarida orqaga qaytish mumkinmi
 *   biz  → 'lokma-wedding:back'          Telegram "Назад": iframe ichida bir qadam orqaga
 */
export const WEDDING_URL = String(import.meta.env.VITE_WEDDING_URL || 'https://wedding.lokma.uz').replace(/\/+$/, '');
const WEDDING_ORIGIN = (() => { try { return new URL(WEDDING_URL).origin; } catch { return 'https://wedding.lokma.uz'; } })();
const LOAD_TIMEOUT_MS = 20_000;
const WARMUP_MS = 2500;

/* Lokma'ning tizim bo'shlig'i (px) — CSS o'zgaruvchisini piksel qilib o'lchaymiz */
function measureCssVar(name) {
  try {
    const probe = document.createElement('div');
    probe.style.cssText = `position:fixed;visibility:hidden;pointer-events:none;height:var(${name},0px)`;
    document.body.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    probe.remove();
    return Number.isFinite(h) ? Math.round(h) : 0;
  } catch { return 0; }
}
/* Pastki: tizim paneli; tepa: status bar + Telegram "Назад / ⋯" tugmalari (theme.css) */
const measureBottomOffset = () => measureCssVar('--tg-bottom-offset');
const measureTopOffset = () => measureCssVar('--tg-top-offset');
/* Faqat status bar (soat, antenna) balandligi — Telegram tugmalarisiz */
const measureStatusTop = () => measureCssVar('--tg-safe-top');

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export function WeddingHost() {
  const navigate = useNavigate();
  const { t, lang, setLang } = useI18n();
  const frameRef = useRef(null);
  const user = useUser((s) => s.user);
  const authStatus = useUser((s) => s.authStatus);
  const setSection = useSection((s) => s.setSection);
  const visible = useWeddingFrame((s) => s.visible);
  const path = useWeddingFrame((s) => s.path);
  const { data: features } = useFeatures(authStatus);
  const allowed = Boolean(features?.wedding);

  const [armed, setArmed] = useState(false);   // iframe yaratilganmi
  const [ready, setReady] = useState(false);   // sayt "tayyor" dedimi
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  /*
   * Edge-to-edge: sayt buni qo'llasa (ready.caps), iframe ekranning ENG TEPASIDAN
   * boshlanadi — to'yxonalar rasmi status bar va Telegram tugmalari ORTIGA chiqadi,
   * tepa bo'shliqni sayt o'zi (insets.top) hisobga oladi. Eski sayt versiyasida
   * avvalgidek: bo'shliqni Lokma qoldiradi.
   */
  const [edge, setEdge] = useState(false);
  const latest = useRef({});
  latest.current = { user, lang, edge };

  // Fonda isitish: Lokma ochilgach bo'sh vaqtda (yoki to'yxonalarga kirilganda darhol)
  useEffect(() => {
    if (!allowed || armed) return undefined;
    if (visible) { setArmed(true); return undefined; }
    const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 300));
    const timer = setTimeout(() => idle(() => setArmed(true)), WARMUP_MS);
    return () => clearTimeout(timer);
  }, [allowed, armed, visible]);

  const post = useCallback((msg) => {
    const win = frameRef.current?.contentWindow;
    // targetOrigin — FAQAT to'yxona sayti
    if (win) win.postMessage(msg, WEDDING_ORIGIN);
  }, []);

  const sendContext = useCallback(() => {
    const { user: u, lang: l } = latest.current;
    post({
      type: 'lokma-wedding:context',
      payload: {
        user: {
          firstName: u?.firstName || '', lastName: u?.lastName || '', phone: u?.phone || null, photoUrl: u?.photoUrl || '',
          username: u?.username || '', photoInitials: u?.photoInitials || '', telegramId: u?.telegramId ? String(u.telegramId) : '',
        },
        // Faqat ko'rsatish/qidirish uchun kerakli maydonlar
        addresses: (u?.addresses || []).map((a) => ({
          id: String(a.id || a._id || ''), title: a.title || '', address: a.address || '', city: a.city || '',
          lat: typeof a.lat === 'number' ? a.lat : undefined, lng: typeof a.lng === 'number' ? a.lng : undefined, labelId: a.labelId || '',
        })),
        defaultAddressId: u?.defaultAddressId ? String(u.defaultAddressId) : null,
        lang: l,
        insets: {
          bottom: measureBottomOffset(),
          top: latest.current.edge ? measureTopOffset() : 0,
          statusTop: latest.current.edge ? measureStatusTop() : 0,
        },
      },
    });
  }, [post]);

  // Telegram "Назад" iframe ichida orqaga qaytara olishi uchun
  useEffect(() => {
    const { setGoBack, setCanGoBack } = useWeddingFrame.getState();
    if (!ready) { setCanGoBack(false); setGoBack(null); return undefined; }
    setGoBack(() => post({ type: 'lokma-wedding:back' }));
    return () => { setGoBack(null); setCanGoBack(false); };
  }, [ready, post]);

  // Profil / til / manzil / edge o'zgarsa — yangisini yuboramiz
  useEffect(() => { if (ready) sendContext(); }, [ready, user, lang, edge, sendContext]);

  // Xavfsiz zona o'zgarsa (aylantirish, fullscreen, Telegram tugmalari) — o'lchamlarni qayta yuboramiz
  useEffect(() => {
    if (!ready) return undefined;
    let raf = 0;
    // telegram.js CSS o'zgaruvchilarini yangilab ulgurishi uchun keyingi kadrda o'lchaymiz
    const resend = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => sendContext()); };
    const tg = getTelegram();
    const events = ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged'];
    window.addEventListener('resize', resend);
    events.forEach((ev) => { try { tg?.onEvent?.(ev, resend); } catch { /* eski Telegram */ } });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resend);
      events.forEach((ev) => { try { tg?.offEvent?.(ev, resend); } catch { /* eski Telegram */ } });
    };
  }, [ready, sendContext]);
  useEffect(() => { if (ready) post({ type: 'lokma-wedding:visible', visible }); }, [ready, visible, post]);
  useEffect(() => { if (ready && visible && path && path !== '/') post({ type: 'lokma-wedding:open', path }); }, [ready, visible, path, post]);

  /* Sayt so'ragan amallar (faqat ruxsat etilgan ro'yxat; qiymatlar tekshiriladi) */
  const handleRpc = useCallback(async (action, payload = {}) => {
    const us = useUser.getState();
    switch (action) {
      case 'updateUser': {
        const patch = {};
        if ('firstName' in payload) { const v = str(payload.firstName, 60); if (!v) throw new Error('Ismni kiriting'); patch.firstName = v; }
        if ('lastName' in payload) patch.lastName = str(payload.lastName, 60);
        if ('phone' in payload) {
          const v = str(payload.phone, 20).replace(/[^\d+]/g, '');
          if (!/^\+998\d{9}$/.test(v)) throw new Error('Telefon: +998XXXXXXXXX');
          patch.phone = v;
        }
        if (!Object.keys(patch).length) throw new Error('Bo‘sh so‘rov');
        us.updateUser(patch);
        return true;
      }
      case 'addAddress': {
        const address = str(payload.address, 200);
        if (address.length < 5) throw new Error('Manzilni to‘liq kiriting');
        await us.addAddress({ title: str(payload.title, 30) || 'Uy', address });
        return true;
      }
      case 'removeAddress': await us.removeAddress(str(payload.id, 64)); return true;
      case 'setDefaultAddress': await us.setDefaultAddress(str(payload.id, 64)); return true;
      case 'setLang': setLang(['uz', 'uzc', 'ru'].includes(payload.lang) ? payload.lang : 'uz'); return true;
      case 'referral': return api.getReferralInfo();
      case 'shareReferral': {
        haptic();
        const info = await api.getReferralInfo();
        if (!info?.referralLink) throw new Error('Havola mavjud emas');
        const url = `https://t.me/share/url?url=${encodeURIComponent(info.referralLink)}&text=${encodeURIComponent(t('referralShareText'))}`;
        const tg = getTelegram();
        if (tg?.openTelegramLink) tg.openTelegramLink(url); else window.open(url, '_blank');
        return true;
      }
      case 'myBookings': return api.getWeddingBookings();
      case 'cancelBooking': {
        const id = str(payload.id, 40);
        if (!/^[a-f0-9]{24}$/i.test(id)) throw new Error('Bron topilmadi');
        return api.cancelWeddingBooking(id);
      }
      default: throw new Error('Noma’lum amal');
    }
  }, [setLang, t]);

  useEffect(() => {
    const onMsg = async (e) => {
      if (e.origin !== WEDDING_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'lokma-wedding:ready') {
        const isEdge = Array.isArray(d.caps) && d.caps.includes('edge-to-edge');
        latest.current.edge = isEdge; // birinchi kontekst darhol to'g'ri o'lcham bilan ketsin
        setEdge(isEdge);
        setReady(true); setFailed(false);
        sendContext();
        post({ type: 'lokma-wedding:visible', visible: useWeddingFrame.getState().visible });
      } else if (d.type === 'lokma-wedding:route') {
        useWeddingFrame.getState().setCanGoBack(Boolean(d.canGoBack));
      } else if (d.type === 'lokma-wedding:navigate') {
        const to = d.to === '/market' ? '/market' : '/';
        setSection(to === '/market' ? 'market' : 'go');
        navigate(to);
      } else if (d.type === 'lokma-wedding:rpc' && typeof d.id === 'string') {
        try {
          const data = await handleRpc(String(d.action), d.payload && typeof d.payload === 'object' ? d.payload : {});
          post({ type: 'lokma-wedding:rpc-result', id: d.id, ok: true, data });
        } catch (err) {
          post({ type: 'lokma-wedding:rpc-result', id: d.id, ok: false, error: err?.message || 'Xatolik' });
        }
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [sendContext, post, handleRpc, navigate, setSection]);

  // Sayt javob bermasa — xato ekrani (faqat ko'rinib turganda ko'rsatiladi)
  useEffect(() => {
    if (!armed || ready) return undefined;
    const timer = setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [armed, ready, reloadKey]);

  if (!allowed || !armed) return null;

  return (
    <div className={`weddings ${visible ? 'is-visible' : 'is-hidden'}${edge ? ' is-edge' : ''}`} aria-hidden={!visible}>
      <iframe
        key={reloadKey}
        ref={frameRef}
        src={`${WEDDING_URL}/?embed=lokma`}
        title={t('lokmaWedding')}
        className="weddings__frame"
        allow="geolocation; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
        tabIndex={visible ? 0 : -1}
      />
      {visible && !ready && !failed && (
        <div className="weddings__loading" aria-live="polite">
          <img src="/sections/wedding-cloche.webp" alt="" width="96" height="96" />
          <div className="weddings__spinner" />
        </div>
      )}
      {visible && failed && !ready && (
        <div className="weddings weddings--msg weddings__overlay">
          <img src="/sections/wedding-cloche.webp" alt="" width="88" height="88" />
          <p>{t('dataLoadFailed')}</p>
          <button type="button" onClick={() => { setFailed(false); setReady(false); setEdge(false); setReloadKey((k) => k + 1); }}>{t('retry')}</button>
          <button type="button" className="is-ghost" onClick={() => { useWeddingFrame.getState().setVisible(false); navigate('/'); }}>{t('goHome')}</button>
        </div>
      )}
    </div>
  );
}
