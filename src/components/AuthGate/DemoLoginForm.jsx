import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { useT } from '@/i18n';
import { demoLogin } from '@/lib/demoLogin';

/*
 * App Store tekshiruvi uchun DEMO kirish formasi. Faqat iOS/Android ilovada va server `capabilities.demoLogin` yoqqandagina
 * ochiladi (LokmaSignIn). Haqiqiy mijozlar Telegram orqali kiradi — ularga bu forma kerak emas.
 */
export function DemoLoginForm({ onBack, onSuccess }) {
  const t = useT();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy || !login.trim() || !password) return;
    setBusy(true); setErr('');
    try {
      const { http, data } = await demoLogin(login.trim(), password);
      if (http === 200 && data.accessToken) { onSuccess(data); return; }
      setErr(http === 429 ? t('demo_many') : (http === 401 || http === 400) ? t('demo_wrong') : t('demo_net'));
    } catch { setErr(t('demo_net')); } finally { setBusy(false); }
  };

  return (
    <form className="lsi lsi-demo" onSubmit={submit} autoComplete="off" data-testid="demo-form">
      <h2 className="lsi-title lsi-title--sm">{t('demo_title')}</h2>
      <p className="lsi-sub">{t('demo_sub')}</p>
      <input
        className="lsi-input" value={login} onChange={(e) => setLogin(e.target.value)} placeholder={t('demo_login')} aria-label={t('demo_login')}
        autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="username" inputMode="text" data-testid="demo-login"
      />
      <div className="lsi-pw">
        <input
          className="lsi-input lsi-input--pw" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('demo_password')} aria-label={t('demo_password')}
          autoCapitalize="none" autoCorrect="off" spellCheck={false} autoComplete="current-password" data-testid="demo-password"
        />
        {/* Ko'z: parolni ko'rsatish/yashirish. mousedown/touchstart'da fokus inputdan KETMAYDI (klaviatura yopilmaydi) */}
        <button
          type="button" className="lsi-eye" onClick={() => setShowPw((v) => !v)} onMouseDown={(e) => e.preventDefault()} onTouchStart={(e) => e.preventDefault()}
          aria-label={showPw ? t('demo_pw_hide') : t('demo_pw_show')} aria-pressed={showPw} data-testid="demo-eye"
        >
          <Icon name={showPw ? 'eyeOff' : 'eye'} size={20} color="currentColor" />
        </button>
      </div>
      {err && <p className="lsi-demo__err" role="alert" data-testid="demo-error">{err}</p>}
      <button type="submit" className="lsi-cta" disabled={busy || !login.trim() || !password} data-testid="demo-submit">
        <Icon name="check" size={18} color="#fff" /><span>{busy ? '…' : t('demo_submit')}</span>
      </button>
      <button type="button" className="lsi-link-btn lsi-link-btn--muted" onClick={onBack}>{t('demo_back')}</button>
    </form>
  );
}
