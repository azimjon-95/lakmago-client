import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '@/i18n';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/telegram';
import { isNativeApp } from '@/lib/clientInfo';
import { isOptedIn, permissionState, setOptIn } from '@/lib/promoPush';
import './PromoPush.css';

/**
 * Profil → "Taom takliflari": reklama push'ini yoqish/o'chirish (Apple 4.5.4: o'chirish imkoni ilova ichida).
 * Faqat iOS/Android ilovada ko'rinadi. Tizimda rad etilgan bo'lsa — yoqish sozlamalarni ochadi.
 */
export function PushToggle() {
  const { t } = useI18n();
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  const sync = useCallback(async () => {
    const p = await permissionState();
    setDenied(p === 'denied');
    setOn(isOptedIn() && p === 'granted');
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return undefined;
    sync();
    // Sozlamalardan qaytganda holat yangilanadi
    const onVis = () => { if (!document.hidden) sync(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [sync]);

  if (!isNativeApp()) return null;

  const toggle = async () => {
    haptic();
    setBusy(true);
    const r = await setOptIn(!on);
    if (r === 'denied') setDenied(true);
    await sync();
    setBusy(false);
  };

  return (
    <button type="button" className="profile-row pp-row" onClick={toggle} disabled={busy}>
      <Icon name="bell" size={18} color="var(--brand)" />
      <div className="profile-row__body">
        <div className="profile-row__value">{t('pushToggleTitle')}</div>
        <div className="profile-row__label">{denied && !on ? t('pushDeniedHint') : t('pushToggleHint')}</div>
      </div>
      <span className="pp-switch" role="switch" aria-checked={on} aria-label={t('pushToggleTitle')} />
    </button>
  );
}
