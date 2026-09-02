import { useNavigate } from 'react-router-dom';
import { useOrders } from '@/store/orders';
import { useT } from '@/i18n';
import './ActiveOrderBadge.css';
import { Icon } from '@/components/Icon';

/*
 * Mijoz buyurtma bergач bosh sahifada chekkada ko'rinadigan
 * kichik tugma. Bosilsa — faol buyurtmalar sahifasiga o'tadi.
 *
 * FAQAT BOSH SAHIFADA: qaysi sahifada ko'rinishini App.jsx
 * (FloatingLayer) hal qiladi — bu yerda ikkinchi marta
 * pathname tekshirilmaydi. Bitta haqiqat manbai bo'lsin deb
 * ataylab shunday: ilgari bu yerda "faqat /order/track va
 * /orders'da YASHIRIN" (qora ro'yxat) mantig'i bor edi va u
 * qolgan HAMMA sahifada (restoran, savat, qidiruv, profil...)
 * ko'rinib turardi — mijoz taom sahifasida ham, savatda ham
 * bu bannerni ko'rardi.
 */
export function ActiveOrderBadge() {
  const navigate = useNavigate();
  const activeOrder = useOrders((s) => s.activeOrder);
  const t = useT();

  if (!activeOrder) return null;

  // Umumiy holat: eng "orqada" turgan sub-buyurtma statusi
  const statusOrder = ['accepted', 'preparing', 'delivering', 'delivered'];
  const subs = activeOrder.subOrders || [];
  const minStatus = subs.reduce((acc, s) => {
    const i = statusOrder.indexOf(s.status);
    return i < acc ? i : acc;
  }, statusOrder.length - 1);
  const statusKey = ['orderAccepted', 'orderPreparing', 'orderDelivering', 'orderDelivered'][minStatus] || 'orderAccepted';

  return (
    <button className="active-order-badge" onClick={() => navigate('/order/track')}>
      <span className="active-order-badge__pulse" />
      <span className="active-order-badge__icon"><Icon name="scooter" size={20} color="var(--brand-text)" /></span>
      <span className="active-order-badge__text">
        <span className="active-order-badge__title">{t('yourOrder')}</span>
        <span className="active-order-badge__status">{t(statusKey)}</span>
      </span>
      <span className="active-order-badge__arrow">›</span>
    </button>
  );
}
