import { useState } from 'react';
import { Icon } from './Icon';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { haptic } from '@/lib/telegram';
import { formatSom } from '@/lib/utils';
import { useT } from '@/i18n';
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
      <div className="ocm-sheet" onClick={(e) => e.stopPropagation()} {...dragProps}>
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

            <div className="ocm-addr__scroll">
              <div className="ocm-addr-card">
                <div className="ocm-addr-card__art" aria-hidden="true" />
                <div className="ocm-addr-card__body">
                  <div className="ocm-addr-chip">
                    <Icon name={labelIcon} size={16} color="var(--brand)" />
                    <span>{address.title || t('address')}</span>
                  </div>
                  <div className="ocm-addr-text" data-testid="addr-text">{address.address || address.street}</div>
                  {address.city && <div className="ocm-addr-city">{address.city}</div>}
                </div>
                {address.note && (
                  <div className="ocm-addr-note">
                    <Icon name="info" size={16} color="var(--brand)" />
                    <span><b>{t('courierNoteLabel')}:</b> {address.note}</span>
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

              <div className="ocm-addr-total">
                <span>{t('total')}</span>
                <b>{formatSom(total)}</b>
              </div>
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
