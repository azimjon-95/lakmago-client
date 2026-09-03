import { Icon } from './Icon';
import { formatSomShort } from '@/lib/utils';
import { useT } from '@/i18n';
import './AdModal.css';

/**
 * Reklama bosilganda ochiladigan modal.
 *
 * Uch holat:
 *   1) Taom reklamasi, HAQIQIY taomga bog'langan (ad.dish bor) —
 *      taomning o'z nomi/narxi ko'rsatiladi, tugma taom
 *      kartochkasiga (buyurtma modaliga) o'tkazadi.
 *   2) Taom reklamasi, lekin taomga bog'lanmagan (restoran o'zi
 *      rasm yuklab, o'zi sarlavha/tavsif yozgan — masalan hali
 *      menyuda yo'q maxsus taklif) — customTitle/customDescription
 *      ko'rsatiladi, narx yo'q, tugma restoran sahifasiga
 *      o'tkazadi (aniq taom kartochkasi yo'q, eng mantiqiy joy).
 *   3) Restoran reklamasi — restoran o'zi yozgan sarlavha bo'lsa
 *      o'sha, bo'lmasa oddiy restoran nomi ko'rsatiladi, tugma
 *      restoran sahifasiga o'tkazadi.
 *
 * Tashqi havola OCHILMAYDI — hammasi dastur ichida qoladi, xuddi
 * foydalanuvchi o'zi qidirib topgandek tabiiy o'tish.
 */
export function AdModal({ ad, onClose, onOpenDish, onOpenRestaurant }) {
  const t = useT();
  const linkedDish = ad.targetType === 'dish' && ad.dish;
  const customDish = ad.targetType === 'dish' && !ad.dish;

  const title = linkedDish
    ? ad.dish.name
    : (ad.customTitle || (ad.targetType === 'restaurant' ? ad.restaurantName : ''));
  const subtitle = linkedDish ? ad.restaurantName : ad.customDescription;

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ad-modal__close" onClick={onClose} aria-label={t('close')}>
          <Icon name="x" size={18} color="#fff" />
        </button>

        <div
          className="ad-modal__image"
          style={{ backgroundImage: `url(${ad.imageUrl})` }}
        />

        <div className="ad-modal__body">
          <div className="ad-modal__tag">{t('adLabel')}</div>

          <div className="ad-modal__title">{title}</div>
          {subtitle && <div className="ad-modal__sub">{subtitle}</div>}
          {linkedDish && ad.dish.price != null && (
            <div className="ad-modal__price">{formatSomShort(ad.dish.price)} {t('som')}</div>
          )}

          {linkedDish ? (
            <button
              className="ad-modal__cta"
              onClick={() => onOpenDish({ id: ad.dish.id, ...ad.dish, restaurantId: ad.restaurantId })}
            >
              {t('viewDish')}
            </button>
          ) : (
            <button
              className="ad-modal__cta"
              onClick={() => onOpenRestaurant(ad.restaurantId)}
            >
              {t('goToRestaurant')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
