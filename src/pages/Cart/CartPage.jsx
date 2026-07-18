import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { AddressSheet } from '@/components/AddressSheet';
import { AddressFlow } from '@/components/AddressFlow/AddressFlow';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { useOrders } from '@/store/orders';
import { useT } from '@/i18n';
import { formatSom } from '@/lib/utils';
import { api } from '@/api';
import { haptic } from '@/lib/telegram';
import { useDishes } from '@/hooks/queries';
import './Cart.css';

const SERVICE_FEE = 3000;
const DELIVERY_FEE = 0;

export function CartPage() {
  const navigate = useNavigate();
  const t = useT();
  const { items, addItem, decrement, removeItem, totalPrice, totalCount, restaurantGroups } = useCart();
  const itemCount = totalCount();
  const user = useUser((s) => s.user);
  const updateUser = useUser((s) => s.updateUser);
  const addAddress = useUser((s) => s.addAddress);
  const setDefaultAddress = useUser((s) => s.setDefaultAddress);
  const lastPaymentMethod = useUser((s) => s.lastPaymentMethod);
  const setLastPaymentMethod = useUser((s) => s.setLastPaymentMethod);
  const placeOrder = useOrders((s) => s.placeOrder);

  const groups = restaurantGroups();
  const [paying, setPaying] = useState(false);
  const [showAddressSheet, setShowAddressSheet] = useState(false);
  const [showAddressFlow, setShowAddressFlow] = useState(false);
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(user.phone ?? '');
  const [paymentMethod, setPaymentMethod] = useState(lastPaymentMethod);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [useBonus, setUseBonus] = useState(false);

  // Referal bonus balansini olamiz
  useEffect(() => {
    api.getReferralInfo().then((r) => setBonusBalance(r.bonusBalance || 0)).catch(() => {});
  }, []);

  const orderSum = totalPrice() + DELIVERY_FEE + SERVICE_FEE;
  // Yetkazish vaqti (barcha restoranlar ичida eng kengi)
  const etaText = (() => {
    if (groups.length === 0) return '';
    const min = Math.min(...groups.map((g) => g.restaurant.deliveryMin ?? 25));
    const max = Math.max(...groups.map((g) => g.restaurant.deliveryMax ?? 40));
    return `${min}–${max} daq`;
  })();

  // Savatni tozalash (tasdiq bilan)
  const confirmClear = () => {
    haptic();
    if (window.confirm('Savatni tozalaysizmi?')) {
      useCart.getState().clear();
    }
  };

  // Ishlatiladigan bonus: balansдан va summадан oshмаsин
  const bonusApplied = useBonus ? Math.min(bonusBalance, orderSum) : 0;
  const total = orderSum - bonusApplied;
  const selectedAddress = user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0];

  if (items.length === 0) {
    return (
      <div className="app-shell cart-empty">
        <Icon name="bag" size={48} color="#A99C8C" />
        <div className="cart-empty__title">{t('cartEmpty')}</div>
        <p className="cart-empty__hint">{t('cartEmptyHint')}</p>
        <button onClick={() => navigate('/')} className="btn-primary">{t('allRestaurants')}</button>
      </div>
    );
  }

  function handlePlaceOrder() {
    if (!selectedAddress) { setShowAddressSheet(true); return; }
    if (!user.phone) { setPhoneDraft(''); setShowPhoneEdit(true); return; }
    setPaying(true);
    setLastPaymentMethod(paymentMethod);
    const addrLabel = `${selectedAddress.title} — ${selectedAddress.address}`;
    const paymentLabel = paymentMethod === 'cash' ? t('cash') : 'Payme';
    // Backendga yuboradi (async). Xato bo'lsa ham local rejim ishlaydi.
    placeOrder(groups, total, addrLabel, paymentLabel, paymentMethod, user.phone, bonusApplied)
      .then(() => {
        setPaying(false);
        useCart.getState().clear();
        navigate('/order/track');
      })
      .catch(() => {
        setPaying(false);
        useCart.getState().clear();
        navigate('/order/track');
      });
  }

  function savePhone() {
    updateUser({ phone: phoneDraft });
    setShowPhoneEdit(false);
  }

  return (
    <div className="app-shell cart">
      <header className="cart-header">
        <button onClick={() => navigate(-1)} aria-label={t('back')} className="cart-header__btn">
          <Icon name="x" size={22} color="#F7F2EA" />
        </button>
        <div className="cart-header__center">
          <h1 className="cart-header__title">{t('cart')}</h1>
          {groups.length > 0 && (
            <div className="cart-header__sub">
              {etaText} · {groups.length === 1 ? groups[0].restaurant.name : `${groups.length} ta muassasa`}
            </div>
          )}
        </div>
        <button onClick={confirmClear} aria-label="Tozalash" className="cart-header__btn">
          <Icon name="trash" size={20} color="#A99C8C" />
        </button>
      </header>

      {groups.length > 1 && (
        <div className="cart-multi-hint">
          <Icon name="bag" size={18} color="#F5A524" />
          <div>{groups.length} ta restoran · har biri alohida yetkaziladi, bitta ekranда kuzatiladi.</div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.restaurant.id} className="cart-group">
          <div className="cart-group__head">
            <div className="cart-group__icon" style={{ background: group.restaurant.tint }}>
              <Icon name={group.restaurant.icon} size={13} color="#F5A524" />
            </div>
            <div className="cart-group__name">{group.restaurant.name}</div>
            <div className="cart-group__time">
              <Icon name="clock" size={12} color="#A99C8C" /> {group.restaurant.deliveryMin}–{group.restaurant.deliveryMax} {t('min')}
            </div>
          </div>
          <div className="cart-items">
            {group.items.map((item) => (
              <div key={item.key} className="cart-item">
                <div className="cart-item__photo">
                  <DishPhoto dish={item.dish} height={56} radius={12} iconSize={26} />
                </div>
                <div className="cart-item__body">
                  <div className="cart-item__top">
                    <div className="cart-item__name">{item.dish.name}</div>
                    <button onClick={() => removeItem(item.key)} aria-label={t('close')}>
                      <Icon name="trash" size={16} color="#A99C8C" />
                    </button>
                  </div>
                  {item.selectedOptions.length > 0 && (
                    <div className="cart-item__opts">{item.selectedOptions.map((o) => o.name).join(', ')}</div>
                  )}
                  <div className="cart-item__bottom">
                    <div className="cart-item__price">{formatSom(item.unitPrice * item.quantity)}</div>
                    <div className="qty-control">
                      <button onClick={() => decrement(item.key)} className="qty-btn qty-btn--minus" aria-label="−">
                        <Icon name="minus" size={14} color="#A99C8C" />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button onClick={() => addItem(item.dish, 1, item.selectedOptions, item.note)} className="qty-btn qty-btn--plus" aria-label="+">
                        <Icon name="plus" size={14} color="#2A1500" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Manzil */}
      <button
        onClick={() => setShowAddressSheet(true)}
        className={`cart-field ${selectedAddress ? '' : 'cart-field--required'}`}
      >
        <Icon name="pin" size={22} color="#F5A524" />
        <div className="cart-field__body">
          {selectedAddress ? (
            <>
              <div className="cart-field__value">{selectedAddress.title} · {selectedAddress.address}</div>
              <div className="cart-field__label">{t('deliveryAddress')}</div>
            </>
          ) : (
            <div className="cart-field__value cart-field__value--accent">{t('address')}</div>
          )}
        </div>
        <Icon name="chevronRight" size={18} color="#A99C8C" />
      </button>

      {/* Telefon */}
      <button
        onClick={() => { setPhoneDraft(user.phone || ''); setShowPhoneEdit(true); }}
        className={`cart-field ${user.phone ? '' : 'cart-field--required'}`}
      >
        <Icon name="phone" size={22} color={user.phone ? '#6FBF73' : '#F5A524'} />
        <div className="cart-field__body">
          <div className={`cart-field__value ${user.phone ? '' : 'cart-field__value--accent'}`}>
            {user.phone || '+998 __ ___ __ __'}
          </div>
          <div className="cart-field__label">Telefon</div>
        </div>
        <Icon name="chevronRight" size={18} color="#A99C8C" />
      </button>

      {/* To'lov */}
      <div className="cart-payment">
        <div className="cart-payment__label">{t('paymentMethod')}</div>
        <div className="cart-payment__options">
          <button
            onClick={() => setPaymentMethod('payme')}
            className={`pay-opt ${paymentMethod === 'payme' ? 'is-active' : ''}`}
          >
            <Icon name="card" size={18} color="#6FBF73" />
            <span>Payme</span>
            {paymentMethod === 'payme' && <Icon name="circleCheck" size={15} color="#6FBF73" />}
          </button>
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`pay-opt ${paymentMethod === 'cash' ? 'is-active' : ''}`}
          >
            <span className="pay-opt__emoji">💵</span>
            <span>{t('cash')}</span>
            {paymentMethod === 'cash' && <Icon name="circleCheck" size={15} color="#F5A524" />}
          </button>
        </div>
      </div>

      {/* Qo'shimcha tavsiya — "Hech narsani unutmadingizmi?" */}
      <CartUpsell groups={groups} />

      {/* Bonus bilan to'lash (referal bonusи bor bo'lsa) */}
      {bonusBalance > 0 && (
        <button onClick={() => setUseBonus((v) => !v)} className={`cart-bonus ${useBonus ? 'is-active' : ''}`}>
          <div className="cart-bonus__left">
            <Icon name="gift" size={20} color={useBonus ? '#6FBF73' : '#F5A524'} />
            <div>
              <div className="cart-bonus__title">Bonus bilan to'lash</div>
              <div className="cart-bonus__balance">Mavjud: {formatSom(bonusBalance)}</div>
            </div>
          </div>
          <div className={`cart-bonus__toggle ${useBonus ? 'is-on' : ''}`}>
            <div className="cart-bonus__knob" />
          </div>
        </button>
      )}

      {/* Hisob */}
      <div className="cart-summary">
        <Row label={t('subtotal')} value={formatSom(totalPrice())} />
        <Row label={t('deliveryFee')} value={DELIVERY_FEE === 0 ? t('free') : formatSom(DELIVERY_FEE)} />
        <Row label="Xizmat haqi" value={formatSom(SERVICE_FEE)} />
        {bonusApplied > 0 && (
          <div className="cart-summary__row cart-summary__row--bonus">
            <span>🎁 Bonus chegirmasi</span>
            <span>−{formatSom(bonusApplied)}</span>
          </div>
        )}
        <div className="cart-summary__total">
          <span>{t('total')}</span>
          <span>{formatSom(total)}</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div className="cart-footer">
        {/* Yetkazish qatori */}
        <div className="cart-footer__delivery">
          <Icon name="truck" size={18} color={DELIVERY_FEE === 0 ? '#6FBF73' : '#A99C8C'} />
          <span className={DELIVERY_FEE === 0 ? 'is-free' : ''}>
            {DELIVERY_FEE === 0 ? 'Bepul yetkazib berish' : `Yetkazish · ${formatSom(DELIVERY_FEE)}`}
          </span>
          <span className="cart-footer__eta">{etaText}</span>
        </div>

        {/* To'lov tugmasi (soni + summa) */}
        <button onClick={handlePlaceOrder} disabled={paying} className="cart-paybtn">
          <span className="cart-paybtn__count">{itemCount}</span>
          <span className="cart-paybtn__label">{paying ? t('loading') : t('payTotal')}</span>
          <span className="cart-paybtn__sum">{formatSom(total)}</span>
        </button>
      </div>

      {showAddressSheet && (
        <AddressSheet
          addresses={user.addresses}
          selectedId={selectedAddress?.id}
          onSelect={(id) => { setDefaultAddress(id); setShowAddressSheet(false); }}
          onAdd={() => { setShowAddressSheet(false); setShowAddressFlow(true); }}
          onClose={() => setShowAddressSheet(false)}
        />
      )}

      {/* Yangi manzil qo'shish oqimi (joylashuv → qidiruv → tafsilotlar) */}
      {showAddressFlow && (
        <AddressFlow
          onSave={(addr) => addAddress(addr)}
          onClose={() => setShowAddressFlow(false)}
        />
      )}

      {showPhoneEdit && (
        <div onClick={() => setShowPhoneEdit(false)} className="sheet-overlay">
          <div onClick={(e) => e.stopPropagation()} className="sheet">
            <div className="sheet__title">Telefon</div>
            <input
              value={phoneDraft}
              onChange={(e) => setPhoneDraft(e.target.value)}
              inputMode="tel"
              placeholder="+998 90 123 45 67"
              autoFocus
              className="input-lg"
            />
            <button onClick={savePhone} disabled={phoneDraft.trim().length < 9} className="btn-primary btn-block">
              {t('save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="cart-summary__row">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// "Hech narsani unutmadingizmi?" — savatдаgi restoran menyusидан tavsiya.
// Savatда bo'lmagan taomlarни ko'rsatadi (upsell).
function CartUpsell({ groups }) {
  const addItem = useCart((s) => s.addItem);
  const items = useCart((s) => s.items);
  const firstRestaurantId = groups[0]?.restaurant?.id;
  const { data: dishes = [] } = useDishes(firstRestaurantId);

  if (!firstRestaurantId || dishes.length === 0) return null;

  // Savatда bor taomlar ID'lari
  const inCartIds = new Set(items.map((i) => i.dish.id || i.dish._id));
  // Savatда yo'q, mavjud taomlar (eng ko'pi 6 ta)
  const suggestions = dishes
    .filter((d) => !inCartIds.has(d.id || d._id) && d.isAvailable !== false)
    .slice(0, 6);

  if (suggestions.length === 0) return null;

  const meta = groups[0].restaurant;
  const add = (dish) => {
    haptic();
    // Restoran meta'sini biriktiramiz (savat to'g'ri ishlashi uchun)
    addItem({
      ...dish,
      restaurantId: firstRestaurantId,
      restaurantName: meta.name,
      restaurantTint: meta.tint,
      restaurantIcon: meta.icon,
      restaurantDeliveryMin: meta.deliveryMin,
      restaurantDeliveryMax: meta.deliveryMax,
      restaurantDeliveryFee: meta.deliveryFee,
    }, 1, []);
  };

  return (
    <div className="cart-upsell">
      <h2 className="cart-upsell__title">Hech narsani unutmadingizmi?</h2>
      <div className="cart-upsell__row no-scrollbar">
        {suggestions.map((d) => (
          <div key={d.id || d._id} className="upsell-card">
            <div className="upsell-card__photo">
              <DishPhoto dish={d} height={110} radius={14} iconSize={34} />
            </div>
            <div className="upsell-card__name">{d.name}</div>
            <div className="upsell-card__price">{formatSom(d.price)}</div>
            <button onClick={() => add(d)} className="upsell-card__add" aria-label="Qo'shish">
              <Icon name="plus" size={18} color="#F5A524" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
