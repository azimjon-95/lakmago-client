import { Icon } from './Icon';
import { formatSomShort } from '@/lib/utils';
import './AdModal.css';

/**
 * Reklama bosilganda ochiladigan modal.
 *
 * Ikki tur:
 *   - Restoran reklamasi -> tugma restoran sahifasiga o'tkazadi
 *   - Taom reklamasi -> tugma taom kartochkasiga (buyurtma
 *     modaliga) o'tkazadi
 *
 * Tashqi havola OCHILMAYDI — hammasi dastur ichida qoladi, xuddi
 * foydalanuvchi o'zi qidirib topgandek tabiiy o'tish.
 */
export function AdModal({ ad, onClose, onOpenDish, onOpenRestaurant }) {
  const isDish = ad.targetType === 'dish' && ad.dish;

  return (
    <div className="ad-modal-overlay" onClick={onClose}>
      <div className="ad-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ad-modal__close" onClick={onClose} aria-label="Yopish">
          <Icon name="x" size={18} color="#fff" />
        </button>

        <div
          className="ad-modal__image"
          style={{ backgroundImage: `url(${ad.imageUrl})` }}
        />

        <div className="ad-modal__body">
          <div className="ad-modal__tag">Reklama</div>

          {isDish ? (
            <>
              <div className="ad-modal__title">{ad.dish.name}</div>
              <div className="ad-modal__sub">{ad.restaurantName}</div>
              {ad.dish.price != null && (
                <div className="ad-modal__price">{formatSomShort(ad.dish.price)} so'm</div>
              )}
              <button
                className="ad-modal__cta"
                onClick={() => onOpenDish({ id: ad.dish.id, ...ad.dish, restaurantId: ad.restaurantId })}
              >
                Taomni ko'rish
              </button>
            </>
          ) : (
            <>
              <div className="ad-modal__title">{ad.restaurantName}</div>
              <button
                className="ad-modal__cta"
                onClick={() => onOpenRestaurant(ad.restaurantId)}
              >
                Restoranga o'tish
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
