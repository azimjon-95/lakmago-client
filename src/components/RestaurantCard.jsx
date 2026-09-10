import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { PHOTO_STYLES } from './DishPhoto';
import { RestaurantBannerFallback } from './RestaurantBannerFallback';
import { formatSomShort } from '@/lib/utils';
import { useT } from '@/i18n';
import { isOpenNow, workHoursLabel } from '@/lib/workHours';
import { usePrefetchRestaurant } from '@/hooks/queries';
import './cards/RestaurantCard.css';

export const RestaurantCard = memo(function RestaurantCard({ restaurant: r }) {
  // Ish vaqti — har render'da hisoblanadi (vaqt o'zgaradi)
  const hours = workHoursLabel(r);
  // Server /restaurants javobida ish kunlarini (workingDays) ham
  // hisobga olgan tayyor isOpen keladi — aniq "yopiq" desa unga
  // ishonamiz, aks holda mijozning o'z (Toshkent vaqtiga mos)
  // jonli hisobiga tayanamiz.
  const open = r.isOpen === false ? false : isOpenNow(r);

  const navigate = useNavigate();
  const t = useT();
  const prefetch = usePrefetchRestaurant();
  const rid = r.id || r._id;
  const hasPhoto = (r.images || []).length > 0;
  const photoKey = hasPhoto ? r.images[0] : null;
  const style = photoKey ? PHOTO_STYLES[photoKey] : null;
  const freeDelivery = r.deliveryFee === 0;
  const realImg = r.imageUrl || (r.images && r.images.find((u) => typeof u === 'string' && u.startsWith('http')));
  const optimizedImg = realImg && realImg.includes('/upload/')
    ? realImg.replace('/upload/', '/upload/f_auto,q_auto,w_500,c_fill/')
    : realImg;

  /*
   * ═══ RASM YUKLANMAGUNCHA / UMUMAN BO'LMAGANDA ═══
   *
   * Ikkala holatda ham (rasm yo'q, YOKI bor-u hali yuklanmagan)
   * bir xil RestaurantBannerFallback ko'rsatiladi — qog'oz fon,
   * diagonal nom, yulduzchalar. Rasm kelgach ustiga yumshoq
   * eriydi (fade-in), fallback esa DOM'dan olib tashlanadi.
   *
   * `imgLoaded` faqat HAQIQIY <img> yuklangandan keyin true
   * bo'ladi — brauzer keshidan darhol kelsa ham onLoad baribir
   * ishlaydi, shuning uchun keshlangan rasmlarda fallback
   * "yopishib qolmaydi".
   */
  const [imgLoaded, setImgLoaded] = useState(false);
  const showFallback = !imgLoaded;

  return (
    <button
      onClick={() => navigate(`/restaurant/${rid}`)}
      onMouseEnter={() => prefetch(rid)}
      onTouchStart={() => prefetch(rid)}
      className="rcard"
    >
      <div className="rcard__banner" style={{ background: style ? style.grad : r.tint }}>
        {optimizedImg && (
          <img
            src={optimizedImg}
            alt={r.name}
            loading="lazy"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
            className={`rcard__img${imgLoaded ? ' is-loaded' : ''}`}
          />
        )}

        {/* Rasm yo'q yoki hali yuklanmagan — umumiy zaxira ko'rinish */}
        {showFallback && <RestaurantBannerFallback name={r.name} />}
        {r.discount && <div className="rcard__tag rcard__tag--discount">−{r.discount}%</div>}
        {r.isFresh && !r.discount && <div className="rcard__tag rcard__tag--new">{t('fresh')}</div>}
        {/* Yetkazish vaqti — banner burchagida (Uzum uslubi) */}
        {(r.deliveryMin > 0 || r.deliveryMax > 0) && (
          <div className="rcard__eta">{r.deliveryMin}–{r.deliveryMax} {t('min')}</div>
        )}
      </div>
      <div className="rcard__body">
        {/* Nom va reyting bir qatorda */}
        <div className="rcard__head">
          <div className="rcard__name">{r.name}</div>
          {r.rating > 0 && (
            <div className="rcard__rating">
              <Icon name="star" size={13} color="var(--brand-100)" /> {r.rating.toFixed(1)}
            </div>
          )}
        </div>
        {r.cuisine && <div className="rcard__cuisine">{r.cuisine}</div>}

        {/* Ish vaqti va hozirgi holat */}
        {hours && (
          <div className="rcard__hours">
            <Icon name="clock" size={12} color={open ? 'var(--success)' : 'var(--danger)'} />
            <span>{hours}</span>
            <span className={`rcard__status ${open ? 'is-open' : 'is-closed'}`}>
              {open ? 'Ochiq' : 'Yopiq'}
            </span>
          </div>
        )}
        <div className="rcard__meta">
          {r.discount > 0 && (
            <>
              <span className="rcard__promo">
                <Icon name="discount" size={13} color="var(--appetite)" /> Chegirma −{r.discount}%
              </span>
              <span className="rcard__sep" />
            </>
          )}
          {freeDelivery ? (
            <span className="rcard__free"><Icon name="bike" size={13} color="var(--success)" /> {t('freeDelivery')}</span>
          ) : (
            <span className="rcard__meta-item"><Icon name="bike" size={13} color="var(--muted)" /> {formatSomShort(r.deliveryFee)} {t('som')}</span>
          )}
        </div>
      </div>
    </button>
  );
});
