import { Icon } from './Icon';
import { formatSom } from '@/lib/utils';
import { useOpenStatus } from '@/hooks/useOpenStatus';
import { useT } from '@/i18n';
import './cards/RestaurantInfoSheet.css';

/**
 * Restoran ma'lumot oynasi.
 *
 * Avval ikkita alohida oyna bor edi — "ish tartibi" va "xizmat
 * haqi va shartlar". Mijoz uchun bu bitta savol: "shartlar
 * qanday?". Ikkiga bo'lish faqat qidirishni qiyinlashtirardi,
 * ustiga sahifada ikkita alohida havola joy egallardi.
 * Endi hammasi bitta oynada, tartib bilan.
 */
export function RestaurantInfoSheet({ restaurant, onClose }) {
  const t = useT();
  const r = restaurant || {};
  const { isOpen, hoursLabel, nextOpen } = useOpenStatus(r);

  const hasFees = r.serviceFeePercent > 0 || r.deliveryFee > 0
    || r.minOrderAmount > 0 || r.deliveryMin > 0;

  /*
   * `r.phone` ATAYLAB olib tashlandi — hozircha restoran
   * telefon raqami mijozga umuman ko'rsatilmaydi. Bu tuzatish
   * FRONTEND darajasida, server allaqachon bu maydonni
   * qaytarmasa ham: agar eski API javobi keshda qolgan bo'lsa
   * yoki server hali yangilanmagan bo'lsa ham, mijoz telefonni
   * ko'rmasligi kafolatlanadi.
   */
  const hasLegal = Boolean(r.legalName || r.address || r.legalAddress || r.inn);

  return (
    <div className="rinfo-overlay" onClick={onClose}>
      <div className="rinfo-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="rinfo-sheet__grabber" />
        <button onClick={onClose} className="rinfo-sheet__close" aria-label={t('close')}>
          <Icon name="x" size={18} color="var(--muted)" />
        </button>

        <div className="rinfo-body">
          <h3 className="rinfo-title rinfo-title--left">{r.name || t('restaurantFallback')}</h3>

          {/* Hozirgi holat — eng kerakli ma'lumot yuqorida */}
          <div className={`rinfo-status ${isOpen ? 'is-open' : 'is-closed'}`}>
            <Icon name="clock" size={16} color={isOpen ? 'var(--success)' : 'var(--danger)'} />
            <span>
              {isOpen ? t('currentlyOpen') : t('currentlyClosed')}
              {hoursLabel && ` · ${hoursLabel}`}
            </span>
          </div>
          {!isOpen && nextOpen && (
            <p className="rinfo-note rinfo-note--tight">{nextOpen}</p>
          )}

          {hasFees && (
            <>
              <h4 className="rinfo-title rinfo-title--left rinfo-title--mt">
                {t('serviceFeeAndDeliveryTitle')}
              </h4>
              <div className="rinfo-rows">
                <Row
                  label={t('serviceFee')}
                  value={r.serviceFeePercent > 0
                    ? `${r.serviceFeePercent}%${r.serviceFeeMin > 0 && r.serviceFeeMax > 0 ? ' *' : ''}`
                    : t('free')}
                  free={!(r.serviceFeePercent > 0)}
                />
                <Row
                  label={t('deliveryTabTitle')}
                  value={r.deliveryFee > 0 ? formatSom(r.deliveryFee) : t('free')}
                  free={!(r.deliveryFee > 0)}
                />
                <Row
                  label={t('minOrderLabel')}
                  value={r.minOrderAmount > 0 ? formatSom(r.minOrderAmount) : t('unlimited')}
                />
                {r.deliveryMin > 0 && (
                  <Row label={t('deliveryTimeLabel')} value={`${r.deliveryMin}–${r.deliveryMax} ${t('minutesShort')}`} />
                )}
              </div>

              {r.serviceFeePercent > 0 && r.serviceFeeMin > 0 && r.serviceFeeMax > 0 && (
                <p className="rinfo-note">
                  * {t('serviceFeeNotePrefix')} {r.serviceFeePercent}% {t('serviceFeeNoteMid')} {formatSom(r.serviceFeeMin)} {t('serviceFeeNoteMid2')} {formatSom(r.serviceFeeMax)} {t('serviceFeeNoteSuffix')}
                </p>
              )}
            </>
          )}

          {r.reservationEnabled && r.reservationNote && (
            <>
              <h4 className="rinfo-title rinfo-title--left rinfo-title--mt">{t('tableBookingTitle')}</h4>
              <p className="rinfo-note">{r.reservationNote}</p>
            </>
          )}

          {hasLegal && (
            <>
              <h4 className="rinfo-title rinfo-title--left rinfo-title--mt">{t('establishmentTitle')}</h4>
              <div className="rinfo-rows">
                {r.legalName && <Row label={t('nameLabel')} value={r.legalName} />}
                {r.address && <Row label={t('address')} value={r.address} />}
                {r.legalAddress && <Row label={t('legalAddressLabel')} value={r.legalAddress} />}
                {r.inn && <Row label="INN" value={r.inn} />}
                {/* Telefon qatori HOZIRCHA olib tashlandi — yuqoridagi izohga qarang */}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, free }) {
  return (
    <div className="rinfo-row">
      <span className="rinfo-row__label">{label}</span>
      <span className={`rinfo-row__value ${free ? 'rinfo-row__value--free' : ''}`}>
        {value}
      </span>
    </div>
  );
}
