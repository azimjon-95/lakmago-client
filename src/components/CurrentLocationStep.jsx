import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { DeliveryRouteMap, formatDistance } from './DeliveryRouteMap';
import { MapAddressPicker } from './AddressFlow/MapAddressPicker';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { canOpenLocationSettings, openLocationSettings } from '@/lib/location';
import { makeOneTimeAddress, ONCE_TEXT_MIN, ONCE_TEXT_MAX } from '@/lib/oneTimeAddress';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import './AddressFlow/AddressFlow.css';
import './CurrentLocationStep.css';

/*
 * ═══ "HOZIRGI JOYIMGA YETKAZISH" (bir martalik GPS manzil) ═══
 *
 * OrderConfirmModal ichidagi qadam (shu sababli yuborish holati, orqaga tugmasi va yopilish mantig'i bitta joyda qoladi):
 *   1. GPS bir necha o'lchov bilan BARQAROR nuqtani aniqlaydi (loading ko'rsatiladi);
 *   2. xarita avtomatik shu nuqtaga markazlashadi (marshrut va masofa bilan);
 *   3. textarea "Manzil va mo'ljal" avtomatik to'ladi (reverse geocoding) — mijoz tahrirlashi mumkin;
 *   4. aniqlik yetarli bo'lmasa — QAYTA ANIQLASH yoki xaritadan nuqta belgilash; ruxsat berilmasa — xaritadan qo'lda tanlash;
 *   5. "Ha, shu manzilga" bosilgandagina bir martalik manzil buyurtmaga biriktiriladi (onConfirm).
 *
 * MUHIM: bu manzil user.addresses / serverdagi saqlangan manzillarga QO'SHILMAYDI (lib/oneTimeAddress.js).
 */
export function CurrentLocationStep({ restaurants = [], initial = null, onBack, onClose, onConfirm }) {
  const t = useT();
  const loc = useCurrentLocation({ initial });
  const { st, text, geo } = loc;
  const [picking, setPicking] = useState(false);
  useModalBackClose(picking, () => setPicking(false));

  const pos = st.pos;
  const hasPos = Number.isFinite(pos?.lat) && Number.isFinite(pos?.lng);
  const acc = Number.isFinite(pos?.accuracy) ? formatDistance(pos.accuracy, t) : '';
  const ready = st.stage === 'ready';
  const textOk = text.trim().length >= ONCE_TEXT_MIN;
  const canConfirm = ready && st.quality !== 'poor' && textOk;

  // Matn maydoni — GPS tayyor bo'lgach birinchi marta ko'rinsa, ekranga olib chiqiladi
  const boxRef = useRef(null);
  useEffect(() => { if (ready) boxRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, [ready]);

  const confirm = () => {
    if (!canConfirm) return;
    haptic();
    onConfirm(makeOneTimeAddress({ lat: pos.lat, lng: pos.lng, accuracy: st.manual ? null : pos.accuracy, text, manual: st.manual }));
  };

  // ── Holat kartasi ──
  let view;
  if (st.stage === 'locating') {
    view = hasPos
      ? { tone: 'idle', title: t('onceLocating'), sub: t('onceStabilizing').replace('{a}', acc), spin: true }
      : st.slow
        ? { tone: 'warn', title: t('onceSlowTitle'), sub: t('onceSlowSub'), spin: true, pick: true }
        : { tone: 'idle', title: t('onceLocating'), sub: t('onceLocatingSub'), spin: true };
  } else if (st.stage === 'error') {
    view = st.code === 'denied'
      ? { tone: 'warn', title: t('onceDeniedTitle'), sub: t('onceDeniedSub'), settings: canOpenLocationSettings(), retry: true, pick: true }
      : st.code === 'unsupported'
        ? { tone: 'warn', title: t('addrGpsUnsupportedTitle'), sub: t('onceDeniedSub'), pick: true }
        : { tone: 'warn', title: t('onceNoSignalTitle'), sub: t('onceNoSignalSub'), retry: true, pick: true };
  } else if (st.manual) {
    view = { tone: 'ok', title: t('onceManualOk'), sub: t('onceManualOkSub'), retry: true };
  } else if (st.quality === 'ok') {
    view = { tone: 'ok', title: t('onceOkTitle'), sub: t('onceOkSub').replace('{a}', acc), retry: true };
  } else if (st.quality === 'weak') {
    view = { tone: 'warn', title: t('onceWeakTitle').replace('{a}', acc), sub: t('onceWeakSub'), retry: true, pick: true };
  } else {
    view = { tone: 'warn', title: t('oncePoorTitle').replace('{a}', acc), sub: t('oncePoorSub'), retry: true, pick: true };
  }

  return (
    <div className="ocm-addr">
      <div className="ocm-head ocm-head--addr">
        <button type="button" onClick={onBack} className="ocm-close ocm-close--back" aria-label={t('back')}>
          <Icon name="arrowLeft" size={18} color="var(--ink)" />
        </button>
        <div className="ocm-head__title ocm-head__title--big">{t('onceTitle')}</div>
        <button type="button" onClick={onClose} className="ocm-close" aria-label={t('close')}>
          <Icon name="x" size={16} color="var(--muted)" />
        </button>
      </div>

      {/* Xarita: aniqlangan joyga avtomatik markazlashadi; GPS topilmaguncha — kutish holati */}
      <div className="ocm-map">
        {hasPos ? (
          <DeliveryRouteMap
            restaurants={restaurants}
            destination={{ lat: pos.lat, lng: pos.lng, label: t('onceChip') }}
            me={st.manual ? null : { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy }}
            onLocate={loc.locate}
          />
        ) : (
          <div className="once-map-ph" data-testid="once-map-wait">
            <span className="ocm-gps__spin" aria-hidden="true" />
            <span>{st.stage === 'error' ? t('onceMapEmpty') : t('onceLocating')}</span>
          </div>
        )}
      </div>

      <div className="ocm-addr__scroll">
        <div className={`ocm-gps ocm-gps--${view.tone}`} role="status" aria-live="polite" data-testid={`once-${st.stage}${ready ? `-${st.manual ? 'manual' : st.quality}` : ''}`}>
          <span className="ocm-gps__icon" aria-hidden="true">
            {view.tone === 'ok'
              ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              : <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z" /></svg>}
          </span>
          <div className="ocm-gps__txt">
            <b>{view.title}</b>
            <span>{view.sub}</span>
          </div>
          {view.spin && <span className="ocm-gps__spin" aria-hidden="true" />}
          {(view.settings || view.retry || view.pick) && (
            <div className="ocm-gps__actions">
              {view.settings && <button type="button" className="ocm-gps__btn" onClick={openLocationSettings}>{t('addrGpsSettings')}</button>}
              {view.retry && <button type="button" className="ocm-gps__btn" onClick={() => { haptic(); loc.locate(); }} data-testid="once-retry">{t('onceRelocate')}</button>}
              {view.pick && <button type="button" className="ocm-gps__btn ocm-gps__btn--solid" onClick={() => { haptic(); setPicking(true); }} data-testid="once-pick">{t('oncePickMap')}</button>}
            </div>
          )}
        </div>

        {/* Manzil va mo'ljal — GPS tayyor bo'lgach; reverse geocoding matnni avtomatik to'ldiradi, mijoz tahrirlaydi */}
        {ready && (
          <div className="once-field" ref={boxRef}>
            <label className="once-field__label" htmlFor="once-text">
              {t('onceTextLabel')}
              {geo === 'loading' && <span className="once-field__geo">{t('onceGeocoding')}</span>}
            </label>
            <textarea
              id="once-text"
              data-testid="once-text"
              className="once-field__input"
              rows={3}
              maxLength={ONCE_TEXT_MAX}
              value={text}
              onChange={(e) => loc.setText(e.target.value)}
              onFocus={(e) => { const el = e.target; setTimeout(() => el.scrollIntoView?.({ block: 'center', behavior: 'smooth' }), 300); }}
              placeholder={t('onceTextPlaceholder')}
            />
            <div className={`once-field__hint${!textOk && geo !== 'loading' ? ' is-need' : ''}`}>
              {!textOk && geo !== 'loading' ? t('onceTextRequired') : t('onceTextHint')}
            </div>
          </div>
        )}

        <div className="once-note">
          <Icon name="info" size={14} color="var(--muted)" />
          <span>{t('onceNotSaved')}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={confirm}
        className="ocm-addr-yes"
        disabled={!canConfirm}
        data-testid="once-confirm"
      >
        {canConfirm && <Icon name="check" size={22} color="currentColor" strokeWidth={3} />}
        <span>{t('addrConfirmYes')}</span>
      </button>

      {/* Qo'lda nuqta tanlash: GPS ruxsati yo'q / aniqlik past bo'lganda. Mavjud xarita tanlagich (igna qotib turadi, xarita suriladi) */}
      {/* Portal: oyna ichidagi `transform`/`backdrop-filter` ota-elementlar `position: fixed` ni o'z ichiga qamrab olmasin */}
      {picking && createPortal(
        <div className="addrflow-overlay once-picker">
          <MapAddressPicker
            start={hasPos ? { lat: pos.lat, lng: pos.lng, accuracy: pos.accuracy } : null}
            onPick={(picked) => { setPicking(false); loc.pickManual(picked); }}
            onBack={() => setPicking(false)}
          />
        </div>,
        document.body,
      )}
    </div>
  );
}
