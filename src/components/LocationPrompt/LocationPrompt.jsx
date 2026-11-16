import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { useI18n } from '@/i18n';
import { useDistrict, useDistrictMeta } from '@/store/district';
import { DISTRICT_SELECTOR_ENABLED, DISTRICT_AUTO_DETECT_ENABLED } from '@/lib/districtFlags';
import { requestDistrictCheck } from '@/hooks/useDistrictEngine';
import { probeAccess } from '@/lib/geoService';
import { locationPlatform, openAppLocationSettings } from '@/lib/locationSettings';
import hero from '@/assets/location-hero.webp';
import './LocationPrompt.css';

/*
 * ═══ «JOYLASHUVINGIZNI ULASHING» OYNASI ═══
 *
 * AVVAL AVTOMATIK: splash vaqtida dvigatel (useDistrictEngine.fullCheck) aniq GPS → qayta urinish → pastroq aniqlik
 * bilan joyni olishga harakat qiladi. Oyna FAQAT hammasi muvaffaqiyatsiz tugagach chiqadi (holat: GPS o'chiq,
 * ruxsat yo'q/rad etilgan, signal/aniqlik yetmadi). Joy olingan bo'lsa — umuman chiqmaydi.
 *
 * «Joylashuvni ulashish»:
 *   GPS o'chiq    → Android: tizimning Joylashuv sozlamasi; iOS/Web/Telegram: qisqa yo'riqnoma (dastur GPS'ni yoqa olmaydi)
 *   ruxsat rad    → Android: ruxsat qayta so'raladi → App info; iOS: ilova sozlamalari; Telegram: bot sozlamasi;
 *                   Web: sayt sozlamalari yo'riqnomasi
 *   so'ralmagan   → tizim ruxsat oynasi (to'liq avtomatik ketma-ketlik bilan)
 * Sozlamalardan qaytilganda (foreground) holat qayta tekshiriladi va joy olinsa oyna o'zi yopiladi.
 * X — yopadi (shu sessiyada qayta chiqmaydi), lekin avtomatik tekshiruv keyingi imkoniyatda (resume/qayta ochish) davom etadi.
 * «Keyinroq» tugmasi YO'Q (TZ). Faqat avto rejimda, bosh sahifada, reklama oynasi ustiga chiqmaydi.
 */
const DISMISS_KEY = 'lokma-locprompt-dismissed';
const NEED = new Set(['no_permission', 'denied', 'error', 'low_accuracy', 'services_off']);
const readDismissed = () => { try { return sessionStorage.getItem(DISMISS_KEY) === '1'; } catch { return false; } };
const isIOSDevice = () => typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent || '');

export function LocationPrompt() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const meta = useDistrictMeta((s) => s.meta);
  const mode = useDistrict((s) => s.selectionMode);
  const status = useDistrict((s) => s.autoStatus);
  const resolving = useDistrict((s) => s.isResolving);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(null);          // null | 'denied' | 'services' | 'gps'
  const [dismissed, setDismissed] = useState(readDismissed);
  const busyRef = useRef(false);

  const enabled = DISTRICT_SELECTOR_ENABLED && DISTRICT_AUTO_DETECT_ENABLED && !!meta?.autoDetect?.enabled;
  const failed = NEED.has(status) && !resolving;
  const want = enabled && !dismissed && pathname === '/' && mode === 'auto' && failed;

  // Ochish: avtomatik urinishlar tugagach (holat barqaror 900 ms), reklama oynasi ko'rinmasa
  useEffect(() => {
    if (open || !want) return undefined;
    let timer = null;
    const tryOpen = () => {
      if (document.documentElement.dataset.promoOpen === '1') { timer = setTimeout(tryOpen, 1500); return; }
      const st = useDistrict.getState().autoStatus;
      setHint(st === 'denied' ? 'denied' : st === 'services_off' ? 'services' : null);
      setOpen(true);
    };
    timer = setTimeout(tryOpen, 900);
    return () => clearTimeout(timer);
  }, [want, open]);

  // Muvaffaqiyat (joy olindi / tashqarida / chegarada) yoki qo'lda tanlov / boshqa sahifa — avtomatik yopiladi
  useEffect(() => {
    if (!open) return;
    const ok = !NEED.has(status) && status !== 'checking' && !resolving;
    if (ok || mode !== 'auto' || pathname !== '/') setOpen(false);
  }, [open, status, resolving, mode, pathname]);

  // Sozlamalardan qaytish (foreground): ruxsat/GPS holatini qayta tekshirib, imkon bo'lsa joyni avtomatik olamiz
  useEffect(() => {
    if (!open) return undefined;
    let t = null;
    const onVis = () => {
      if (document.visibilityState !== 'visible' || busyRef.current) return;
      clearTimeout(t);
      t = setTimeout(async () => {
        const pr = await probeAccess();
        if (pr.services === 'off') { setHint('services'); return; }
        if (pr.permission === 'denied') { setHint('denied'); return; }
        if (pr.permission === 'granted') await run(() => requestDistrictCheck({ interactive: true }));
      }, 600);
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ochiq paytda fon aylanmasin; Escape — yopish
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(fn) {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true);
    try { await fn(); } finally { busyRef.current = false; setBusy(false); }
    const st = useDistrict.getState().autoStatus;
    if (st === 'denied') setHint('denied');
    else if (st === 'services_off') setHint('services');
    else if (st === 'error' || st === 'low_accuracy') setHint('gps');
  }

  function close() {
    setOpen(false); setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch { /* */ }
  }

  const share = () => run(async () => {
    const pr = await probeAccess();
    if (pr.services === 'off') {
      setHint('services');
      await openAppLocationSettings('services');   // Android: Joylashuv sozlamasi; boshqalarda — yo'riqnoma ko'rinadi
      return;
    }
    if (pr.permission === 'denied') {
      const r = await openAppLocationSettings('permission');
      if (r === 'granted') { await requestDistrictCheck({ interactive: true }); return; }
      setHint('denied');
      if (r === 'manual') await requestDistrictCheck({ interactive: true });   // Web: sayt sozlamasini o'zgartirgan bo'lsa
      return;
    }
    await requestDistrictCheck({ interactive: true });
  });

  if (!open) return null;

  const platform = locationPlatform();
  const ios = platform === 'ios' || isIOSDevice();
  const hintText = hint === 'denied'
    ? `${t('locAskDeniedText')} ${t({ telegram: 'locAskHintTelegram', ios: 'locAskHintIos', android: 'locAskHintAndroid', web: 'locAskHintWeb' }[platform])}`
    : hint === 'services'
      ? `${t('locServicesOffText')} ${t(ios ? 'locHintServicesIos' : 'locHintServicesAndroid')}`
      : hint === 'gps' ? t('locGpsText') : null;

  return (
    <div className="locm" role="dialog" aria-modal="true" aria-labelledby="locm-title" data-testid="location-prompt">
      <div className="locm__backdrop" onClick={close} />
      <div className="locm__sheet">
        <button type="button" className="locm__close" onClick={close} aria-label={t('close')}>
          <Icon name="x" size={18} color="var(--muted)" />
        </button>
        <img className="locm__hero" src={hero} alt="" width="720" height="431" decoding="async" />
        <h2 id="locm-title" className="locm__title">{t('locTitle')}</h2>
        <p className="locm__text">{t('locSubtitle')}</p>
        <div className="locm__perks">
          <div className="locm__perk"><Icon name="pin" size={24} color="var(--brand)" /><span>{t('locBenefitNear')}</span></div>
          <div className="locm__perk"><Icon name="zap" size={24} color="var(--brand)" /><span>{t('locBenefitFast')}</span></div>
          <div className="locm__perk"><Icon name="locateFixed" size={24} color="var(--brand)" /><span>{t('locBenefitExact')}</span></div>
        </div>
        {hintText && <div className="locm__hint" role="status">{hintText}</div>}
        <button type="button" className="locm__btn" onClick={share} disabled={busy}>
          {busy ? <span className="locm__spin" aria-hidden="true" /> : <Icon name="send" size={20} color="#fff" />}
          <span>{busy ? t('districtDetecting') : t('locShareBtn')}</span>
        </button>
      </div>
    </div>
  );
}
