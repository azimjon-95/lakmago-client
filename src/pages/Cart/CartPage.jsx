import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { AddressSheet } from '@/components/AddressSheet';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { useOrders } from '@/store/orders';
import { useT } from '@/i18n';
import { formatSom } from '@/lib/utils';
import './Cart.css';

const SERVICE_FEE = 3000;
const DELIVERY_FEE = 0;

export function CartPage() {
  const navigate = useNavigate();
  const t = useT();
  const { items, addItem, decrement, removeItem, totalPrice, restaurantGroups } = useCart();
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
  const [showPhoneEdit, setShowPhoneEdit] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState(user.phone ?? '');
  const [paymentMethod, setPaymentMethod] = useState(lastPaymentMethod);

  const total = totalPrice() + DELIVERY_FEE + SERVICE_FEE;
  const selectedAddress = user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0];

  if (items.length === 0) {
    return (
      <div className="app-shell cart-empty">
        <Icon name="bag" size={48} color="#9A9A94" />
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
    placeOrder(groups, total, addrLabel, paymentLabel, paymentMethod, user.phone)
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
      <header className="page-header">
        <button onClick={() => navigate(-1)} aria-label={t('back')}>
          <Icon name="arrowLeft" size={22} color="#F2F1EE" />
        </button>
        <h1>{t('cart')}</h1>
      </header>

      {groups.length > 1 && (
        <div className="cart-multi-hint">
          <Icon name="bag" size={18} color="#EF9F27" />
          <div>{groups.length} ta restoran · har biri alohida yetkaziladi, bitta ekranда kuzatiladi.</div>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.restaurant.id} className="cart-group">
          <div className="cart-group__head">
            <div className="cart-group__icon" style={{ background: group.restaurant.tint }}>
              <Icon name={group.restaurant.icon} size={13} color="#EF9F27" />
            </div>
            <div className="cart-group__name">{group.restaurant.name}</div>
            <div className="cart-group__time">
              <Icon name="clock" size={12} color="#9A9A96" /> {group.restaurant.deliveryMin}–{group.restaurant.deliveryMax} {t('min')}
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
                      <Icon name="trash" size={16} color="#9A9A94" />
                    </button>
                  </div>
                  {item.selectedOptions.length > 0 && (
                    <div className="cart-item__opts">{item.selectedOptions.map((o) => o.name).join(', ')}</div>
                  )}
                  <div className="cart-item__bottom">
                    <div className="cart-item__price">{formatSom(item.unitPrice * item.quantity)}</div>
                    <div className="qty-control">
                      <button onClick={() => decrement(item.key)} className="qty-btn qty-btn--minus" aria-label="−">
                        <Icon name="minus" size={14} color="#9A9A96" />
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button onClick={() => addItem(item.dish, 1, item.selectedOptions, item.note)} className="qty-btn qty-btn--plus" aria-label="+">
                        <Icon name="plus" size={14} color="#2C1400" />
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
        <Icon name="pin" size={22} color="#EF9F27" />
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
        <Icon name="chevronRight" size={18} color="#9A9A94" />
      </button>

      {/* Telefon */}
      <button
        onClick={() => { setPhoneDraft(user.phone || ''); setShowPhoneEdit(true); }}
        className={`cart-field ${user.phone ? '' : 'cart-field--required'}`}
      >
        <Icon name="phone" size={22} color={user.phone ? '#5DCAA5' : '#EF9F27'} />
        <div className="cart-field__body">
          <div className={`cart-field__value ${user.phone ? '' : 'cart-field__value--accent'}`}>
            {user.phone || '+998 __ ___ __ __'}
          </div>
          <div className="cart-field__label">Telefon</div>
        </div>
        <Icon name="chevronRight" size={18} color="#9A9A94" />
      </button>

      {/* To'lov */}
      <div className="cart-payment">
        <div className="cart-payment__label">{t('paymentMethod')}</div>
        <div className="cart-payment__options">
          <button
            onClick={() => setPaymentMethod('payme')}
            className={`pay-opt ${paymentMethod === 'payme' ? 'is-active' : ''}`}
          >
            <Icon name="card" size={18} color="#5DCAA5" />
            <span>Payme</span>
            {paymentMethod === 'payme' && <Icon name="circleCheck" size={15} color="#5DCAA5" />}
          </button>
          <button
            onClick={() => setPaymentMethod('cash')}
            className={`pay-opt ${paymentMethod === 'cash' ? 'is-active' : ''}`}
          >
            <span className="pay-opt__emoji">💵</span>
            <span>{t('cash')}</span>
            {paymentMethod === 'cash' && <Icon name="circleCheck" size={15} color="#EF9F27" />}
          </button>
        </div>
      </div>

      {/* Hisob */}
      <div className="cart-summary">
        <Row label={t('subtotal')} value={formatSom(totalPrice())} />
        <Row label={t('deliveryFee')} value={DELIVERY_FEE === 0 ? t('free') : formatSom(DELIVERY_FEE)} />
        <Row label="Xizmat haqi" value={formatSom(SERVICE_FEE)} />
        <div className="cart-summary__total">
          <span>{t('total')}</span>
          <span>{formatSom(total)}</span>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div className="cart-footer">
        <button onClick={handlePlaceOrder} disabled={paying} className="btn-primary btn-block">
          {paying ? t('loading') : `${t('placeOrder')} · ${formatSom(total)}`}
        </button>
      </div>

      {showAddressSheet && (
        <AddressSheet
          addresses={user.addresses}
          selectedId={selectedAddress?.id}
          onSelect={(id) => { setDefaultAddress(id); setShowAddressSheet(false); }}
          onAdd={(addr) => addAddress(addr)}
          onClose={() => setShowAddressSheet(false)}
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
