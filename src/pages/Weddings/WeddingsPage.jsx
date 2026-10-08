import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@/store/user';
import { useSection } from '@/store/section';
import { useI18n } from '@/i18n';
import { useFeatures } from '@/hooks/queries';
import { setTelegramSurfaceColor, applySectionTheme } from '@/lib/telegram';
import './Weddings.css';

/*
 * ═══ LOKMA TO'YXONALARI — Lokma Go ICHIDA ═══
 *
 * To'yxonalar — alohida sayt (wedding.lokma.uz, alohida server), lekin mijoz
 * buni sezmasligi kerak: sayt shu sahifada butun ekranli <iframe> bo'lib
 * ochiladi (Telegram WebApp ham, mobil ilova ham — tashqi brauzerga chiqmaydi).
 *
 * Ko'prik (postMessage), ikki tomonda ham manzil (origin) qat'iy tekshiriladi:
 *   sayt → 'lokma-wedding:ready'            — tayyor, ma'lumot kutyapti
 *   biz  → 'lokma-wedding:context'          — ism, telefon, manzillar, til
 *                                              (FAQAT wedding.lokma.uz manziliga)
 *   sayt → 'lokma-wedding:navigate' {to}    — Lokma Go ('/') yoki Market ('/market')
 *
 * Mijoz ma'lumoti to'yxona serverida saqlanmaydi — faqat sahifa xotirasida.
 */
export const WEDDING_URL = String(import.meta.env.VITE_WEDDING_URL || 'https://wedding.lokma.uz').replace(/\/+$/, '');
const WEDDING_ORIGIN = (() => { try { return new URL(WEDDING_URL).origin; } catch { return 'https://wedding.lokma.uz'; } })();
const LOAD_TIMEOUT_MS = 20_000;

export function WeddingsPage() {
  const navigate = useNavigate();
  const { t, lang } = useI18n();
  const frameRef = useRef(null);
  const user = useUser((s) => s.user);
  const authStatus = useUser((s) => s.authStatus);
  const setSection = useSection((s) => s.setSection);
  const { data: features, isLoading: featLoading } = useFeatures(authStatus);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // Telegram tepa qismi — to'yxonalar oq fonda; chiqishda joriy bo'lim rangi qaytadi
  useEffect(() => {
    setTelegramSurfaceColor('#FFFFFF');
    return () => applySectionTheme(useSection.getState().section);
  }, []);

  const sendContext = useCallback(() => {
    const win = frameRef.current?.contentWindow;
    if (!win) return;
    const payload = {
      user: {
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
        phone: user?.phone || null,
        photoUrl: user?.photoUrl || '',
      },
      // Faqat ko'rsatish/qidirish uchun kerakli maydonlar
      addresses: (user?.addresses || []).map((a) => ({
        id: String(a.id || a._id || ''),
        title: a.title || '',
        address: a.address || '',
        city: a.city || '',
        lat: typeof a.lat === 'number' ? a.lat : undefined,
        lng: typeof a.lng === 'number' ? a.lng : undefined,
        labelId: a.labelId || '',
      })),
      defaultAddressId: user?.defaultAddressId ? String(user.defaultAddressId) : null,
      lang,
    };
    // targetOrigin — FAQAT to'yxona sayti (boshqa manzilga hech qachon ketmaydi)
    win.postMessage({ type: 'lokma-wedding:context', payload }, WEDDING_ORIGIN);
  }, [user, lang]);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.origin !== WEDDING_ORIGIN || e.source !== frameRef.current?.contentWindow) return;
      const d = e.data;
      if (!d || typeof d !== 'object') return;
      if (d.type === 'lokma-wedding:ready') {
        setReady(true);
        setFailed(false);
        sendContext();
      } else if (d.type === 'lokma-wedding:navigate') {
        const to = d.to === '/market' ? '/market' : '/';
        // Market'ga — Market bo'limi; Lokma Go'ga — oddiy bo'lim
        setSection(to === '/market' ? 'market' : 'go');
        navigate(to);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [sendContext, navigate, setSection]);

  // Profil/manzil o'zgarsa (masalan, kirish tugadi) — yangisini yuboramiz
  useEffect(() => { if (ready) sendContext(); }, [ready, sendContext]);

  // Sayt javob bermasa — xato ekrani (internet yo'q, sayt ishlamayapti)
  useEffect(() => {
    if (ready) return undefined;
    const timer = setTimeout(() => setFailed(true), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready, reloadKey]);

  if (!featLoading && !features?.wedding) {
    return (
      <div className="weddings weddings--msg">
        <p>{t('marketUnavailable')}</p>
        <button type="button" onClick={() => navigate('/')}>{t('goHome')}</button>
      </div>
    );
  }

  return (
    <div className="weddings">
      <iframe
        key={reloadKey}
        ref={frameRef}
        src={`${WEDDING_URL}/?embed=lokma`}
        title={t('lokmaWedding')}
        className="weddings__frame"
        allow="geolocation; clipboard-write"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      {!ready && !failed && (
        <div className="weddings__loading" aria-live="polite">
          <img src="/sections/wedding-cloche.webp" alt="" width="96" height="96" />
          <div className="weddings__spinner" />
        </div>
      )}
      {failed && !ready && (
        <div className="weddings weddings--msg weddings__overlay">
          <img src="/sections/wedding-cloche.webp" alt="" width="88" height="88" />
          <p>{t('dataLoadFailed')}</p>
          <button type="button" onClick={() => { setFailed(false); setReloadKey((k) => k + 1); }}>{t('retry')}</button>
          <button type="button" className="is-ghost" onClick={() => navigate('/')}>{t('goHome')}</button>
        </div>
      )}
    </div>
  );
}
