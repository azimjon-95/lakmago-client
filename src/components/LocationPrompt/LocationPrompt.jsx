import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/i18n';
import { useDistrict, useDistrictMeta } from '@/store/district';
import { DISTRICT_SELECTOR_ENABLED, DISTRICT_AUTO_DETECT_ENABLED } from '@/lib/districtFlags';
import { requestDistrictCheck } from '@/hooks/useDistrictEngine';
import { locationPermissionState } from '@/lib/locationPermission';
import { locationPlatform, openAppLocationSettings } from '@/lib/locationSettings';
import './LocationPrompt.css';

/*
 * ═══ «JOYLASHUVINGIZNI ULASHASIZMI?» — KICHIK OYNA ═══
 *
 * Splash vaqtidagi avto-aniqlash joylashuvni OLA OLMAGAN bo'lsa (ruxsat yo'q / rad etilgan / GPS signal topilmadi),
 * bosh sahifa ochilganda pastda kichik oyna chiqadi:
 *   ask    — ruxsat so'ralmagan: «Ha» → tizim oynasi (requestDistrictCheck interactive)
 *   denied — ruxsat rad etilgan: «Sozlamalarni ochish» (Telegram/iOS/Android) yoki yo'riqnoma (brauzer)
 *   gps    — ruxsat bor, lekin signal yo'q (GPS o'chiq / bino ichida): «Qayta urinish» + GPS'ni yoqish eslatmasi
 * Qoidalar: faqat avto rejimda (qo'lda tanlov ustun), faqat bosh sahifada, reklama oynasi ustiga chiqmaydi,
 * «Keyinroq» — shu sessiyada qayta chiqmaydi. Joylashuv aniqlansa oyna o'zi yopiladi. Ilova hech qachon bloklanmaydi.
 */
const DISMISS_KEY = 'lokma-locprompt-dismissed';
const NEED = { no_permission: 'ask', denied: 'denied', error: 'gps', low_accuracy: 'gps' };

const readDismissed = () => { try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } };

export function LocationPrompt() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const meta = useDistrictMeta((s) => s.meta);
  const mode = useDistrict((s) => s.selectionMode);
  const status = useDistrict((s) => s.autoStatus);
  const resolving = useDistrict((s) => s.isResolving);
  const detected = useDistrict((s) => s.lastAutoDetectedDistrictId);
  const [phase, setPhase] = useState(null);       // null | 'ask' | 'denied' | 'gps'
  const [busy, setBusy] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);
  const shownFor = useRef(null);                   // oyna ochilgandagi aniqlangan tuman (o'zgarsa — yopamiz)

  const enabled = DISTRICT_SELECTOR_ENABLED && DISTRICT_AUTO_DETECT_ENABLED && !!meta?.autoDetect?.enabled;
  const want = enabled && !dismissed && pathname === '/' && mode === 'auto' && !resolving ? NEED[status] : null;

  // Ochish: holat barqaror bo'lsin (splash/animatsiyadan keyin 900 ms) va reklama oynasi ko'rinmasin
  useEffect(() => {
    if (phase || !want) return undefined;
    let timer = null;
    const tryOpen = () => {
      if (document.documentElement.dataset.promoOpen === '1') { timer = setTimeout(tryOpen, 1500); return; }
      shownFor.current = useDistrict.getState().lastAutoDetectedDistrictId;
      setPhase(want); setShowHint(false);
    };
    timer = setTimeout(tryOpen, 900);
    return () => clearTimeout(timer);
  }, [want, phase]);

  // Joylashuv aniqlandi (sozlamalardan qaytgach ham) yoki qo'lda tanlandi / sahifa almashdi — yopiladi
  useEffect(() => {
    if (!phase) return;
    if (mode !== 'auto' || pathname !== '/' || (detected && detected !== shownFor.current) || (status === 'idle' && !resolving && detected)) setPhase(null);
  }, [phase, mode, pathname, detected, status, resolving]);

  if (!phase) return null;

  const later = () => {
    setPhase(null); setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* */ }
  };
  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const perm = await locationPermissionState();
      if (perm === 'denied') { setPhase('denied'); return; }
      await requestDistrictCheck({ interactive: true });
      const st = useDistrict.getState().autoStatus;
      if (st === 'denied') setPhase('denied');
      else if (st === 'error' || st === 'low_accuracy') setPhase('gps');
    } finally { setBusy(false); }
  };
  const openSettings = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await openAppLocationSettings();
      if (r === 'granted') { await requestDistrictCheck({ interactive: true }); return; }
      setShowHint(true);   // ochilmasa yoki qaytib kelsa — qo'lda qilish yo'riqnomasi ko'rinib tursin
    } finally { setBusy(false); }
  };

  const platform = locationPlatform();
  const hintKey = { telegram: 'locAskHintTelegram', ios: 'locAskHintIos', android: 'locAskHintAndroid', web: 'locAskHintWeb' }[platform];
  const text = phase === 'denied' ? t('locAskDeniedText') : phase === 'gps' ? t('locAskGpsText') : t('locAskText');

  return (
    <div className="locask" role="dialog" aria-modal="false" aria-labelledby="locask-title" data-testid="location-prompt">
      <div className="locask__card">
        <div className="locask__icon" aria-hidden="true"><Icon name="pin" size={20} color="var(--brand)" /></div>
        <div className="locask__body">
          <div id="locask-title" className="locask__title">{t('locAskTitle')}</div>
          <div className="locask__text">{text}</div>
          {(phase === 'denied' && (showHint || platform === 'web')) && <div className="locask__hint">{t(hintKey)}</div>}
          <div className="locask__actions">
            <button type="button" className="locask__btn locask__btn--ghost" onClick={later}>{t('locAskLater')}</button>
            {phase === 'ask' && <button type="button" className="locask__btn" onClick={share} disabled={busy}>{busy ? t('districtDetecting') : t('locAskYes')}</button>}
            {phase === 'gps' && <button type="button" className="locask__btn" onClick={share} disabled={busy}>{busy ? t('districtDetecting') : t('locAskRetry')}</button>}
            {phase === 'denied' && platform !== 'web' && <button type="button" className="locask__btn" onClick={openSettings} disabled={busy}>{t('locAskOpenSettings')}</button>}
            {phase === 'denied' && platform === 'web' && <button type="button" className="locask__btn" onClick={share} disabled={busy}>{t('locAskRetry')}</button>}
          </div>
        </div>
        <button type="button" className="locask__close" onClick={later} aria-label={t('close')}><Icon name="x" size={16} color="var(--muted)" /></button>
      </div>
    </div>
  );
}
