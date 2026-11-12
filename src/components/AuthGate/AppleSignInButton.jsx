import { useRef, useState } from 'react';
import { useT } from '@/i18n';
import { haptic } from '@/lib/telegram';
import { signInWithApple, useAppleLoginAvailable } from '@/lib/appleAuth';
import './AppleSignInButton.css';

/*
 * "Apple bilan davom etish" — faqat iOS ilovada va server yoqqanda ko'rinadi (aks holda hech narsa chizilmaydi).
 * Telegram tugmasidan MUSTAQIL: bekor qilish jim, xato faqat shu tugma ostida matn; Telegram va mehmon rejimi ishlashda davom etadi.
 * Apple HIG: qora tugma, Apple belgisi, "Continue with Apple"; balandligi ≥ 44 pt.
 */
const AppleLogo = () => (
  <svg className="apple-btn__logo" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
  </svg>
);

export function AppleSignInButton({ onSuccess }) {
  const t = useT();
  const available = useAppleLoginAvailable();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const busyRef = useRef(false);
  if (!available) return null;

  const click = async () => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setError('');
    haptic?.('light');
    try {
      const data = await signInWithApple();
      onSuccess?.(data);
    } catch (e) {
      if (e?.kind === 'cancelled') { /* foydalanuvchi oynani yopdi — jim; Telegram va mehmon rejimi ishlayveradi */ }
      else setError(t(e?.kind === 'blocked' ? 'apple_err_blocked' : 'apple_err'));
    } finally { busyRef.current = false; setBusy(false); }
  };

  return (
    <div className="apple-wrap" data-testid="apple-signin">
      <button type="button" className="apple-btn" onClick={click} disabled={busy} aria-busy={busy} data-testid="apple-signin-btn">
        <AppleLogo /><span>{busy ? t('apple_busy') : t('apple_cta')}</span>
      </button>
      {error && <p className="apple-err" role="alert">{error}</p>}
    </div>
  );
}
