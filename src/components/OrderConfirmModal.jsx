import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { haptic } from '@/lib/telegram';
import { formatSom } from '@/lib/utils';
import { useT } from '@/i18n';
import { DeliveryRouteMap, formatDistance } from './DeliveryRouteMap';
import { useAddressGpsCheck } from '@/hooks/useAddressGpsCheck';
import { canOpenLocationSettings, openLocationSettings } from '@/lib/location';
import './OrderConfirmModal.css';

/**
 * Buyurtmani yuborishdan OLDINGI so'nggi tekshiruv.
 *
 * NEGA KERAK: "To'lov summasi" tugmasi bosilishi bilan buyurtma
 * DARHOL ketardi — xato taom qo'shib qo'yilgan yoki manzil
 * noto'g'ri bo'lsa, orqaga qaytarib bo'lmasdi. Endi mijoz
 * chekni (printer taffasidagi kabi) ko'rib, ONGLI ravishda
 * yana bir marta tasdiqlaydi.
 */
export function OrderConfirmModal({
  groups, pricing, total, onClose, onConfirm, submitting,
  // Yetkazishda: 2-qadam — manzilni tasdiqlash. Olib ketishda `address` yo'q.
  address = null, addressBlock = null, onChooseAddress, onEditAddress,
  // Xarita uchun restoranlar koordinatasi: [{ id, name, lat, lng }]
  restaurants = [],
}) {
  const t = useT();
  // Pastga tortib yopish (ikkala qadamda ham butun oynani yopadi)
  const { dragProps, overlayStyle } = useSheetDrag(onClose);

  /*
   * ═══ IKKI QADAM ═══
   *   'check'   — chek: taomlar va summa (avvalgidek);
   *   'address' — "Shu manzilga yetkazamizmi?" (faqat yetkazishda).
   *
   * Nega alohida oyna emas, shu oyna ichida: yuborish holati
   * (`submitting`), yopilish va xatolar mantig'i CartPage'da shu
   * oynaga bog'langan — ikkinchi oyna ularni takrorlashni talab
   * qilardi. Ichki qadam esa hammasini o'zgartirmaydi.
   */
  const needsAddressStep = Boolean(address);
  const [step, setStep] = useState('check');
  // 2-qadamga o'tgan paytdagi narx — manzil almashsa narx o'zgarganini ko'rsatish uchun
  const [seen, setSeen] = useState(null);

  const goAddress = () => {
    haptic();
    setSeen({ total, delivery: pricing.deliveryFee });
    setStep('address');
  };
  const goCheck = () => { haptic(); setStep('check'); };

  // Joriy GPS ↔ saqlangan manzil (faqat manzil qadamida so'raladi)
  const [gps, recheckGps] = useAddressGpsCheck(address, step === 'address');
  // "Manzil to'g'ri" bosilsa ogohlantirish yig'iladi; GPS qayta tekshirilib holat o'zgarsa — yana ko'rinishi mumkin
  const [farAcked, setFarAcked] = useState(false);
  useEffect(() => { if (gps.state !== 'far') setFarAcked(false); }, [gps.state]);

  // Android "orqaga": 2-qadamda avval chekka qaytadi, keyingisi oynani yopadi
  useModalBackClose(step === 'address' && !submitting, goCheck);

  const handleYes = () => {
    if (needsAddressStep) goAddress();
    else onConfirm();
  };


  // Manzil turiga mos belgi (Uy / Ish / Boshqa)
  const labelIcon = address?.labelId === 'home' ? 'house'
    : address?.labelId === 'work' ? 'briefcase' : 'pin';

  // 2-qadamda narx o'zgarganmi (manzil almashtirilgach yetkazish narxi boshqacha chiqishi mumkin)
  const priceChanged = seen !== null && Math.round(seen.total) !== Math.round(total);

  // Tugma holati: nima uchun bosib bo'lmayotgani mijozga aytiladi (jim o'chib qolmaydi)
  const blocked = addressBlock?.kind || null;
  const yesLabel = submitting ? t('sendingLabel')
    : blocked === 'calculating' ? t('addrPriceCalculating')
    : t('addrConfirmYes');

  return (
    <div className="ocm-overlay" onClick={onClose} style={overlayStyle}>
      <div className={`ocm-sheet${step === 'address' ? ' ocm-sheet--map' : ''}`} onClick={(e) => e.stopPropagation()} {...dragProps}>
        <div className="ocm-handle" />

        {/* Qadam ko'rsatkichi — mijoz "yana qancha qoldi" ni biladi */}
        {needsAddressStep && (
          <div className="ocm-steps" aria-hidden="true">
            <span className={`ocm-steps__dot ${step === 'check' ? 'is-active' : 'is-done'}`} />
            <span className={`ocm-steps__dot ${step === 'address' ? 'is-active' : ''}`} />
          </div>
        )}

        {step === 'check' && (
          <>
            <div className="ocm-head">
              <div className="ocm-head__icon"><Icon name="checks" size={22} color="var(--brand)" /></div>
              <div className="ocm-head__title">{t('checkOrderTitle')}</div>
              <button onClick={onClose} className="ocm-close" aria-label={t('close')}>
                <Icon name="x" size={16} color="var(--muted)" />
              </button>
            </div>

            {/* Chek — printerdan chiqqan taffadek */}
            <div className="ocm-receipt">
              <div className="ocm-receipt__zigzag ocm-receipt__zigzag--top" />

              {groups.map((g) => (
                <div key={g.restaurant.id} className="ocm-receipt__group">
                  <div className="ocm-receipt__restaurant">{g.restaurant.name}</div>
                  {g.items.map((item) => (
                    <div key={item.key} className="ocm-receipt__row">
                      <span className="ocm-receipt__qty">{item.quantity}×</span>
                      <span className="ocm-receipt__name">
                        {item.dish.name}
                        {item.selectedOptions.length > 0 && (
                          <span className="ocm-receipt__opts"> ({item.selectedOptions.map((o) => o.name).join(', ')})</span>
                        )}
                      </span>
                      <span className="ocm-receipt__price">{formatSom(item.unitPrice * item.quantity)}</span>
                    </div>
                  ))}
                </div>
              ))}

              <div className="ocm-receipt__dashed" />

              <div className="ocm-receipt__row ocm-receipt__row--sum">
                <span>{t('productsLabel')}</span>
                <span>{formatSom(pricing.subtotal)}</span>
              </div>
              {pricing.deliveryFee > 0 && (
                <div className="ocm-receipt__row ocm-receipt__row--sum">
                  <span>{t('delivery')}</span>
                  <span>{formatSom(pricing.deliveryFee)}</span>
                </div>
              )}
              {pricing.serviceFee > 0 && (
                <div className="ocm-receipt__row ocm-receipt__row--sum">
                  <span>{t('serviceFee')}</span>
                  <span>{formatSom(pricing.serviceFee)}</span>
                </div>
              )}
              {/* Chegirmasiz qatorlar yig'indisi "Jami" ga to'g'ri
                  kelmasdi — mijoz chekni o'qib chalkashardi */}
              {pricing.pickupDiscount > 0 && (
                <div className="ocm-receipt__row ocm-receipt__row--sum">
                  <span>{t('pickupDiscountFull')}</span>
                  <span>−{formatSom(pricing.pickupDiscount)}</span>
                </div>
              )}

              <div className="ocm-receipt__dashed" />
              <div className="ocm-receipt__row ocm-receipt__row--total">
                <span>{t('total')}</span>
                <span>{formatSom(total)}</span>
              </div>

              <div className="ocm-receipt__zigzag ocm-receipt__zigzag--bottom" />
            </div>

            <p className="ocm-question">
              {t('readyToSendQuestion')}
            </p>

            <div className="ocm-actions">
              <button onClick={onClose} className="ocm-btn ocm-btn--ghost" disabled={submitting}>
                {t('backLabel')}
              </button>
              <button onClick={handleYes} className="ocm-btn ocm-btn--primary" disabled={submitting}>
                {submitting ? t('sendingLabel') : t('yesSendLabel')}
              </button>
            </div>
          </>
        )}

        {/* ═══ 2-QADAM: MANZILNI TASDIQLASH ═══ */}
        {step === 'address' && address && (
          <div className="ocm-addr">
            <div className="ocm-head ocm-head--addr">
              <button
                type="button"
                onClick={goCheck}
                className="ocm-close ocm-close--back"
                aria-label={t('back')}
                disabled={submitting}
              >
                <Icon name="arrowLeft" size={18} color="var(--ink)" />
              </button>
              <div className="ocm-head__title ocm-head__title--big">{t('addrConfirmTitle')}</div>
              <button onClick={onClose} className="ocm-close" aria-label={t('close')}>
                <Icon name="x" size={16} color="var(--muted)" />
              </button>
            </div>

            {/* Haqiqiy xarita: restoran(lar), manzil, joriy GPS va HAQIQIY marshrut (joyida turadi, ostidagi qism aylanadi) */}
            <div className="ocm-map">
              <DeliveryRouteMap
                restaurants={restaurants}
                destination={{ lat: address.lat, lng: address.lng, label: address.title || t('address') }}
                me={gps.pos ? { lat: gps.pos.lat, lng: gps.pos.lng, accuracy: gps.pos.accuracy } : null}
                onLocate={recheckGps}
              />
            </div>

            <div className="ocm-addr__scroll">

              {/* GPS holati va ogohlantirish — BITTA ixcham blok (avval ikki karta edi: biri aylanishda xarita tagiga yashirinardi) */}
              <GpsCheck
                gps={gps}
                acked={farAcked}
                onKeep={() => { haptic(); setFarAcked(true); }}
                onRetry={recheckGps}
                onChoose={onChooseAddress}
                busy={submitting}
                t={t}
              />

              <div className="ocm-addr-card2">
                <div className="ocm-addr-card2__top">
                  <div className="ocm-addr-chip">
                    <Icon name={labelIcon} size={17} color="var(--brand)" />
                    <span>{address.title || t('address')}</span>
                  </div>
                  <button type="button" className="ocm-addr-edit" onClick={onEditAddress} disabled={submitting}>
                    <Icon name="edit" size={15} color="var(--ink)" />
                    <span>{t('addrEditThis')}</span>
                  </button>
                </div>
                <div className="ocm-addr-text" data-testid="addr-text">{address.address || address.street}</div>
                {/* Shahar va kuryerga izoh — bitta ixcham qator (2 qatorgacha), alohida katta quti emas */}
                {(address.city || address.note) && (
                  <div className="ocm-addr-sub">
                    {address.city}
                    {address.city && address.note ? ' · ' : ''}
                    {address.note && <><b>{t('courierNoteLabel')}:</b> {address.note}</>}
                  </div>
                )}
              </div>

              {/* Nima uchun davom etib bo'lmayotgani — aniq va sodda */}
              {blocked === 'no_point' && (
                <div className="ocm-notice ocm-notice--warn" role="alert">{t('addrNoPointNotice')}</div>
              )}
              {blocked === 'out_of_range' && (
                <div className="ocm-notice ocm-notice--err" role="alert">
                  {addressBlock.message || t('addrOutOfRangeNotice')}
                </div>
              )}

              {/* Manzil almashgach narx boshqacha bo'lsa — mijoz albatta ko'rishi kerak */}
              {priceChanged && !blocked && (
                <div className="ocm-notice ocm-notice--warn" role="status">
                  <b>{t('addrPriceChanged')}</b>
                  <div className="ocm-notice__row">
                    <span>{t('delivery')}</span>
                    <span>
                      <s>{formatSom(seen.delivery)}</s> → <b>{formatSom(pricing.deliveryFee)}</b>
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Maketdagidek: "Jami" doim ko'rinadi — tasdiqlash tugmasi ustida, aylanmaydi */}
            <div className="ocm-addr-total">
              <span>{t('total')}</span>
              <b>{formatSom(total)}</b>
            </div>

            <button
              type="button"
              onClick={onConfirm}
              className="ocm-addr-yes"
              disabled={submitting || Boolean(blocked)}
              data-loading={submitting ? 'true' : undefined}
            >
              {!submitting && !blocked && <Icon name="check" size={22} color="currentColor" strokeWidth={3} />}
              <span>{yesLabel}</span>
            </button>

            <div className="ocm-addr-alt">
              <button type="button" onClick={onChooseAddress} className="ocm-addr-alt__btn" disabled={submitting}>
                <Icon name="pin" size={18} color="var(--ink)" />
                <span>{t('addrChooseOther')}</span>
              </button>
              <button
                type="button"
                onClick={onEditAddress}
                className={`ocm-addr-alt__btn ${blocked === 'no_point' ? 'is-attention' : ''}`}
                disabled={submitting}
              >
                <Icon name="edit" size={18} color="var(--ink)" />
                <span>{t('addrEditThis')}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/*
 * Joriy GPS ↔ saqlangan manzil holati — BITTA ixcham blok. Har holat aniq aytadi: nima bo'ldi va nima qilish mumkin.
 * Muammoli holatlarda (GPS yo'q / aniqlik past / uzoq kutilmoqda) doim ikki yo'l bor: qayta urinish VA manzilni
 * qo'lda tanlash — interfeys hech qachon "boshi berk" bo'lmaydi. Sezilarli uzoqlikda esa ogohlantirish shu blokning
 * o'zi bo'lib, "Manzil to'g'ri" / "O'zgartirish" amallarini beradi (buyurtmani to'smaydi).
 */
function GpsCheck({ gps, acked, onKeep, onRetry, onChoose, busy, t }) {
  const st = gps.state;
  if (st === 'idle' || st === 'nopoint') return null;
  const dist = Number.isFinite(gps.d) ? formatDistance(gps.d, t) : '';
  const accM = Number.isFinite(gps.acc ?? gps.U) ? formatDistance(gps.acc ?? gps.U, t) : '';

  if (st === 'far' && !acked) {
    return (
      <div className="ocm-gps-warn" role="status" aria-live="polite" data-testid="gps-far">
        <svg className="ocm-gps-warn__icon" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>
        <div className="ocm-gps-warn__body">
          <b>{t('addrGpsFar').replace('{d}', dist)}</b>
          <span>{t('addrGpsFarSub')}</span>
          <div className="ocm-gps-warn__actions">
            <button type="button" className="ocm-gps__btn ocm-gps__btn--solid" onClick={onKeep}>{t('addrGpsFarKeep')}</button>
            <button type="button" className="ocm-gps__btn" onClick={onChoose} disabled={busy}>{t('addrGpsFarChange')}</button>
          </div>
        </div>
      </div>
    );
  }

  const stabilizing = st === 'checking' && Number.isFinite(gps.U) && gps.U > 50;
  const view = {
    checking: gps.slow
      ? { tone: 'warn', title: t('addrGpsSlowTitle'), sub: t('addrGpsSlow'), retry: true, choose: true, spin: true }
      : { tone: 'idle', title: t('addrGpsSavedTitle'), sub: stabilizing ? t('addrGpsStabilizing').replace('{a}', accM) : t('addrGpsChecking'), spin: true },
    ok: { tone: 'ok', title: t('addrGpsOkTitle'), sub: t('addrGpsOkSub').replace('{d}', dist) },
    near: { tone: 'idle', title: t('addrGpsSavedTitle'), sub: t('addrGpsNearSub').replace('{d}', dist).replace('{a}', accM) },
    far: { tone: 'idle', title: t('addrGpsSavedTitle'), sub: t('addrGpsFarShort').replace('{d}', dist) },
    lowacc: { tone: 'warn', title: t('addrGpsLowTitle'), sub: t('addrGpsLowSub').replace('{a}', accM), retry: true, choose: true },
    denied: { tone: 'warn', title: t('addrGpsDeniedTitle'), sub: t('addrGpsDeniedSub'), settings: canOpenLocationSettings(), retry: true, choose: true },
    unavailable: { tone: 'warn', title: t('addrGpsNoSignalTitle'), sub: t('addrGpsNoSignalSub'), retry: true, choose: true },
    unsupported: { tone: 'warn', title: t('addrGpsUnsupportedTitle'), sub: t('addrGpsDeniedSub'), choose: true },
  }[st];
  if (!view) return null;
  return (
    <div className={`ocm-gps ocm-gps--${view.tone}`} role="status" aria-live="polite" data-testid={`gps-${st}${gps.slow ? '-slow' : ''}`}>
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
      {(view.settings || view.retry || view.choose) && (
        <div className="ocm-gps__actions">
          {view.settings && <button type="button" className="ocm-gps__btn" onClick={openLocationSettings}>{t('addrGpsSettings')}</button>}
          {view.retry && !view.settings && <button type="button" className="ocm-gps__btn" onClick={onRetry}>{t('addrGpsRetry')}</button>}
          {view.choose && <button type="button" className="ocm-gps__btn ocm-gps__btn--solid" onClick={onChoose}>{t('addrGpsPick')}</button>}
        </div>
      )}
    </div>
  );
}
