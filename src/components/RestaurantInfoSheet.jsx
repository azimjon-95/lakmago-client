import { Icon } from './Icon';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { formatSom, formatSomShort } from '@/lib/utils';
import { deliveryTerms, hasDeliveryTerms } from '@/lib/deliveryInfo';
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
  const { isOpen, hoursLabel, nextOpen, offToday, daysLabel, offDaysLabel } = useOpenStatus(r);

  /*
   * Yetkazish shartlari — restoranning FAOL rejimiga qarab (lib/deliveryInfo.js).
   * Avval faqat `deliveryFee` ko'rsatilardi: kilometrli restoranda u zaxira
   * narx bo'lgani uchun mijoz noto'g'ri narxni ko'rardi.
   */
  const terms = deliveryTerms(r);
  const hasFees = hasDeliveryTerms(r)
    || r.minOrderAmount > 0 || r.deliveryMin > 0;

  /*
   * `r.phone` ATAYLAB olib tashlandi — hozircha restoran
   * telefon raqami mijozga umuman ko'rsatilmaydi. Bu tuzatish
   * FRONTEND darajasida, server allaqachon bu maydonni
   * qaytarmasa ham: agar eski API javobi keshda qolgan bo'lsa
   * yoki server hali yangilanmagan bo'lsa ham, mijoz telefonni
   * ko'rmasligi kafolatlanadi.
   */
  /*
   * MIJOZGA FAQAT MANZIL KO'RSATILADI.
   *
   * Yuridik nom, yuridik manzil va INN OLIB TASHLANDI. Ular
   * mijoz uchun foydasiz: u ovqat buyurtma qilyapti, hujjat
   * tekshirmayapti. Bundan tashqari uzun yuridik nomlar
   * ("... mas'uliyati cheklangan jamiyati") oynani buzardi.
   *
   * Ma'lumotlar bazada va admin panelda saqlanib qoladi —
   * shartnoma va hisob-kitob uchun ular kerak.
   */
  const hasLegal = Boolean(r.address);

  // Pastga tortib yopish
  const { dragProps, overlayStyle } = useSheetDrag(onClose);

  return (
    <div className="rinfo-overlay" onClick={onClose} style={overlayStyle}>
      <div className="rinfo-sheet" onClick={(e) => e.stopPropagation()} {...dragProps}>
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
              {isOpen ? t('currentlyOpen') : (offToday ? t('closedToday') : t('currentlyClosed'))}
              {hoursLabel && ` · ${hoursLabel}`}
            </span>
          </div>
          {daysLabel && (
            <p className="rinfo-note rinfo-note--tight">
              Ish kunlari: {daysLabel}{offDaysLabel ? ` · Dam olish: ${offDaysLabel}` : ''}
            </p>
          )}
          {!isOpen && nextOpen && (
            <p className="rinfo-note rinfo-note--tight">{nextOpen}</p>
          )}

          {hasFees && (
            <>
              <h4 className="rinfo-title rinfo-title--left rinfo-title--mt">
                {t('serviceFeeAndDeliveryTitle')}
              </h4>
              <div className="rinfo-rows">
                {/*
                  "Xizmat haqi" qatori OLIB TASHLANDI.
                  Mijoz uchun bu chalkash edi: u savatda baribir
                  yakuniy summani ko'radi, bu yerda esa foiz
                  ko'rsatilib, "yana qancha qo'shiladi?" degan
                  savol tug'ilardi. Hisob-kitobda o'zgarish yo'q.
                */}
                <DeliveryRows terms={terms} t={t} />
                <Row
                  label={t('minOrderLabel')}
                  value={r.minOrderAmount > 0 ? formatSom(r.minOrderAmount) : t('unlimited')}
                />
                {r.deliveryMin > 0 && (
                  <Row label={t('deliveryTimeLabel')} value={`${r.deliveryMin}–${r.deliveryMax} ${t('minutesShort')}`} />
                )}
              </div>

              {/*
                Xizmat haqi izohi ham olib tashlandi — u yuqoridagi
                "*" belgisiga havola qilardi, o'sha qator esa endi
                yo'q. Izohsiz yulduzcha mijozni chalg'itardi.
              */}
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
                {r.address && <Row label={t('address')} value={r.address} />}
                {/* Telefon qatori HOZIRCHA olib tashlandi — yuqoridagi izohga qarang */}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, free, muted }) {
  return (
    <div className={`rinfo-row ${muted ? 'rinfo-row--muted' : ''}`}>
      <span className="rinfo-row__label">{label}</span>
      <span className={`rinfo-row__value ${free ? 'rinfo-row__value--free' : ''}`}>
        {value}
      </span>
    </div>
  );
}

/*
 * "Yetkazib berish" qatori + faol rejimni TUSHUNTIRADIGAN pastki qatorlar.
 *
 *   Kilometrga qarab:   1 km gacha — 5 000 so'm
 *                       Keyin har km uchun +2 000 so'm
 *                       Masalan, 3 km — 9 000 so'm
 *                       Masalan, 5 km — 13 000 so'm
 *   Bitta narx:         15 000 so'm  (+ "masofadan qat'i nazar")
 *   Bepul / o'chiq:     Bepul / Mavjud emas
 *
 * Bepul yetkazish chegarasi va eng uzoq masofa — ikkala rejimda ham.
 * Kilometrli rejimda oxirida "aniq narx savatda" eslatmasi: mijoz ekrandagi
 * misolni o'z narxi deb o'ylamasin.
 */
function DeliveryRows({ terms, t }) {
  const title = t('deliveryTabTitle');

  if (terms.mode === 'off') return <Row label={title} value={t('deliveryUnavailable')} />;

  if (terms.mode === 'flat') {
    return (
      <>
        <Row label={title} value={terms.free ? t('free') : formatSom(terms.fee)} free={terms.free} />
        {(terms.threshold > 0 || terms.maxKm > 0 || !terms.free) && (
          <div className="rinfo-sub">
            {!terms.free && <p className="rinfo-sub__note">{t('deliveryFlatNote')}</p>}
            {terms.threshold > 0 && (
              <Row label={t('deliveryFreeFrom', { sum: formatSomShort(terms.threshold) })} value={t('free')} free />
            )}
            {terms.maxKm > 0 && (
              <Row label={t('deliveryMaxKm')} value={t('deliveryMaxKmValue', { km: terms.maxKm })} />
            )}
          </div>
        )}
      </>
    );
  }

  // perKm
  const plus = terms.basePrice > 0 ? '+' : '';
  return (
    <>
      <Row label={title} value={t('deliveryByKm')} />
      <div className="rinfo-sub" data-testid="delivery-terms">
        {terms.freeKm > 0 ? (
          <Row
            label={t('deliveryUpToKm', { km: terms.freeKm })}
            value={terms.basePrice > 0 ? formatSom(terms.basePrice) : t('free')}
            free={terms.basePrice === 0}
          />
        ) : terms.basePrice > 0 ? (
          <Row label={t('deliveryStartPrice')} value={formatSom(terms.basePrice)} />
        ) : null}
        <Row
          label={terms.hasFirstTier ? t('deliveryThenPerKm') : t('deliveryPerKm')}
          value={`${plus}${formatSom(terms.perKm)}`}
        />
        {terms.examples.map((ex) => (
          <Row key={ex.km} label={t('deliveryExampleKm', { km: ex.km })} value={formatSom(ex.price)} muted />
        ))}
        {terms.threshold > 0 && (
          <Row label={t('deliveryFreeFrom', { sum: formatSomShort(terms.threshold) })} value={t('free')} free />
        )}
        {terms.maxKm > 0 && (
          <Row label={t('deliveryMaxKm')} value={t('deliveryMaxKmValue', { km: terms.maxKm })} />
        )}
        <p className="rinfo-sub__note">{t('deliveryExactNote')}</p>
      </div>
    </>
  );
}
