import { Icon } from './Icon';
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
export function OrderConfirmModal({ groups, pricing, total, onClose, onConfirm, submitting }) {
  const t = useT();
  return (
    <div className="ocm-overlay" onClick={onClose}>
      <div className="ocm-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="ocm-handle" />

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
          <button onClick={onConfirm} className="ocm-btn ocm-btn--primary" disabled={submitting}>
            {submitting ? t('sendingLabel') : t('yesSendLabel')}
          </button>
        </div>
      </div>
    </div>
  );
}
