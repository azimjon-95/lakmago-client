import { useState } from 'react';
import { Icon } from './Icon';
import { formatDistance } from './DeliveryRouteMap';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';
import './FarDecision.css';

/*
 * ═══ «QAYERGA YETKAZAMIZ?» — MAJBURIY TANLOV ═══
 * Mijoz saqlangan manzildan ≥ 500 m uzoqda (lib/gpsCheck.js isFarBlock) bo'lganda chiqadi. Bosib o'tib ketiladigan ogohlantirish
 * o'rniga IKKI aniq tanlov: «Hozirgi joyimga» (bir martalik GPS manzil) yoki saqlangan manzilga — ikkinchisi AYNAN tasdiqlanadi.
 * Tanlamaguncha buyurtma yuborilmaydi (OrderConfirmModal tugmani o'chirib turadi).
 *
 *   ● Siz hozir ┄┄┄ 8,2 km ┄┄┄ 📍 Uy        ← bir qarashda tushuniladigan chizma
 *   [ 📍 Hozirgi joyimga   (Tavsiya) ]
 *   [ 🏠 «Uy» manziliga               ] → tasdiq: «Kuryer shu manzilga boradi, siz turgan joyga emas»
 */
export function FarDecision({ distanceM, name, address, onNow, onKeep, busy = false, initialConfirming = false }) {
  const t = useT();
  const [confirming, setConfirming] = useState(initialConfirming);
  const dist = formatDistance(distanceM, t);
  const place = name || t('address');

  return (
    <section className="fd" role="group" aria-labelledby="fd-title" data-testid="far-decision">
      {/* Chizma: men → masofa → saqlangan manzil */}
      <div className="fd-route" aria-hidden="true">
        <div className="fd-node fd-node--me"><span className="fd-me"><i /></span><small>{t('farYou')}</small></div>
        <div className="fd-line"><span className="fd-chip">{dist}</span></div>
        <div className="fd-node fd-node--pin"><span className="fd-pin"><Icon name="pin" size={18} color="#fff" /></span><small>{place}</small></div>
      </div>

      <h3 id="fd-title" className="fd-title">{t('farTitle')}</h3>
      <p className="fd-sub" aria-live="polite">{t('farSub').replace('{name}', place).replace('{d}', dist)}</p>

      {!confirming ? (
        <div className="fd-options">
          <button type="button" className="fd-opt fd-opt--primary" onClick={() => { haptic(); onNow(); }} disabled={busy} data-testid="far-now">
            <span className="fd-opt__ic fd-opt__ic--blue"><Icon name="navigation" size={22} color="#2563EB" /></span>
            <span className="fd-opt__txt"><b>{t('farNowTitle')}</b><small>{t('farNowSub')}</small></span>
            <em className="fd-badge">{t('farBadge')}</em>
          </button>
          <button type="button" className="fd-opt" onClick={() => { haptic(); setConfirming(true); }} disabled={busy} data-testid="far-saved">
            <span className="fd-opt__ic"><Icon name="house" size={22} color="var(--ink)" /></span>
            <span className="fd-opt__txt"><b>{t('farSavedTitle').replace('{name}', place)}</b><small>{address}</small></span>
            <Icon name="chevronRight" size={18} color="var(--muted)" />
          </button>
        </div>
      ) : (
        <div className="fd-confirm" data-testid="far-confirm">
          <div className="fd-confirm__addr"><Icon name="house" size={20} color="var(--ink)" /><span><b>{place}</b>{address ? ` · ${address}` : ''}</span></div>
          <p className="fd-warn"><Icon name="info" size={16} color="#B45309" />{t('farConfirmWarn').replace('{d}', dist)}</p>
          <button type="button" className="fd-yes" onClick={() => { haptic(); onKeep(); }} disabled={busy} data-testid="far-yes">
            <Icon name="check" size={20} color="#fff" strokeWidth={3} />{t('farConfirmYes')}
          </button>
          <button type="button" className="fd-back" onClick={() => setConfirming(false)} disabled={busy}>{t('back')}</button>
        </div>
      )}
    </section>
  );
}
