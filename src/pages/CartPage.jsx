import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { DishPhoto } from '@/components/DishPhoto';
import { AddressSheet } from '@/components/AddressSheet';
import { useCart } from '@/store/cart';
import { useUser } from '@/store/user';
import { useOrders } from '@/store/orders';
import { formatSom } from '@/lib/utils';

const SERVICE_FEE = 3000;
const DELIVERY_FEE = 0;

export function CartPage() {
  const navigate = useNavigate();
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
      <div className="min-h-screen bg-surface max-w-[420px] mx-auto flex flex-col items-center justify-center px-8 text-center">
        <Icon name="bag" size={48} color="#9A9A94" />
        <div className="text-lg font-medium text-ink mt-4">Savatcha bo'sh</div>
        <p className="text-sm text-muted mt-1.5">Menyudan taom tanlab, buyurtma bering.</p>
        <button
          onClick={() => navigate('/')}
          className="mt-6 bg-brand-ink text-white text-sm font-medium px-6 py-3 rounded-xl">
          
          Restoranlarga o'tish
        </button>
      </div>);

  }

  function handlePlaceOrder() {
    // TZ: telefon/manzil hali kiritilmagan bo'lsa, aynan shu bosqichda so'raladi
    if (!selectedAddress) {
      setShowAddressSheet(true);
      return;
    }
    if (!user.phone) {
      setPhoneDraft('');
      setShowPhoneEdit(true);
      return;
    }

    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setLastPaymentMethod(paymentMethod);
      const addrLabel = `${selectedAddress.title} — ${selectedAddress.address}`;
      const paymentLabel = paymentMethod === 'cash' ? 'Naqt · kuryerga' : 'Payme · onlayn';
      placeOrder(groups, total, addrLabel, paymentLabel, paymentMethod);
      useCart.getState().clear();
      navigate('/order/track');
    }, 900);
  }

  function savePhone() {
    updateUser({ phone: phoneDraft });
    setShowPhoneEdit(false);
  }

  return (
    <div className="min-h-screen bg-canvas max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 pt-3.5 pb-3 bg-surface flex items-center gap-3 border-b border-line sticky top-0 z-10">
        <button onClick={() => navigate(-1)} aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#1A1A17" />
        </button>
        <div className="text-lg font-medium text-ink">Savatcha</div>
      </div>

      {groups.length > 1 &&
      <div className="mx-4 mt-3 bg-brand-50 rounded-xl p-3 flex items-center gap-2.5">
          <Icon name="bag" size={18} color="#BA7517" />
          <div className="text-xs text-brand-800 leading-relaxed">
            {groups.length} ta restorandan bitta buyurtma — har biri alohida tayyorlanib, alohida
            kuryer bilan yetkaziladi. Siz uchun bitta ekranda kuzatiladi.
          </div>
        </div>
      }

      {groups.map((group) =>
      <div key={group.restaurant.id} className="mt-3 mx-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-[7px] flex items-center justify-center" style={{ background: group.restaurant.tint }}>
              <Icon name={group.restaurant.icon} size={13} color="#EF9F27" />
            </div>
            <div className="text-sm font-medium text-ink">{group.restaurant.name}</div>
            <div className="text-[11px] text-muted ml-auto flex items-center gap-1">
              <Icon name="clock" size={12} color="#6B6B66" /> {group.restaurant.deliveryMin}-{group.restaurant.deliveryMax} daq
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {group.items.map((item) =>
          <div key={item.key} className="bg-surface border border-line rounded-card p-3 flex gap-3">
                <div className="w-14 h-14 flex-none">
                  <DishPhoto dish={item.dish} height={56} radius={12} iconSize={26} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-medium text-ink">{item.dish.name}</div>
                    <button onClick={() => removeItem(item.key)} aria-label="O'chirish">
                      <Icon name="trash" size={16} color="#9A9A94" />
                    </button>
                  </div>
                  {item.selectedOptions.length > 0 &&
              <div className="text-[11px] text-muted mt-0.5">
                      {item.selectedOptions.map((o) => o.name).join(', ')}
                    </div>
              }
                  {item.note && <div className="text-[11px] text-muted italic mt-0.5">{item.note}</div>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm font-medium text-ink">{formatSom(item.unitPrice * item.quantity)}</div>
                    <div className="flex items-center gap-2.5">
                      <button
                    onClick={() => decrement(item.key)}
                    className="w-7 h-7 rounded-lg border border-line flex items-center justify-center text-muted"
                    aria-label="Kamaytirish">
                    
                        <Icon name="minus" size={14} color="#6B6B66" />
                      </button>
                      <span className="text-sm font-medium text-ink w-3 text-center">{item.quantity}</span>
                      <button
                    onClick={() => addItem(item.dish, 1, item.selectedOptions, item.note)}
                    className="w-7 h-7 rounded-lg bg-brand-400 flex items-center justify-center"
                    aria-label="Qo'shish">
                    
                        <Icon name="plus" size={14} color="#2C1400" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          )}
          </div>
        </div>
      )}

      {/* Manzil */}
      <button
        onClick={() => setShowAddressSheet(true)}
        className="mx-4 mt-4 mb-3 bg-surface rounded-card p-3.5 flex items-center gap-3 text-left"
        style={{ border: selectedAddress ? '0.5px solid #EAE7DF' : '1.5px solid #EF9F27' }}>
        
        <Icon name="pin" size={22} color="#EF9F27" />
        <div className="flex-1 min-w-0">
          {selectedAddress ?
          <>
              <div className="text-[13px] font-medium text-ink">
                {selectedAddress.title} · {selectedAddress.address}
              </div>
              <div className="text-xs text-muted">Yetkazish manzili</div>
            </> :

          <div className="text-[13px] font-medium text-[#BA7517]">Yetkazish manzilini kiriting</div>
          }
        </div>
        <Icon name="chevronRight" size={18} color="#9A9A94" />
      </button>

      {/* Telefon */}
      <button
        onClick={() => {
          setPhoneDraft(user.phone || '');
          setShowPhoneEdit(true);
        }}
        className="mx-4 mb-3 bg-surface rounded-card p-3.5 flex items-center gap-3 text-left"
        style={{ border: user.phone ? '0.5px solid #EAE7DF' : '1.5px solid #EF9F27' }}>
        
        <Icon name="phone" size={22} color={user.phone ? '#0F6E56' : '#EF9F27'} />
        <div className="flex-1">
          <div className="text-[13px] font-medium" style={{ color: user.phone ? '#1A1A17' : '#BA7517' }}>
            {user.phone || 'Telefon raqamini kiriting'}
          </div>
          <div className="text-xs text-muted">Aloqa telefoni</div>
        </div>
        <Icon name="chevronRight" size={18} color="#9A9A94" />
      </button>

      {/* To'lov turi */}
      <div className="mx-4 mb-3 bg-surface border border-line rounded-card p-3.5">
        <div className="text-xs text-muted mb-2.5">To'lov usuli</div>
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentMethod('payme')}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[10px]"
            style={
            paymentMethod === 'payme' ?
            { border: '1.5px solid #0F6E56', background: '#E1F5EE' } :
            { border: '0.5px solid #EAE7DF', background: '#fff' }
            }>
            
            <Icon name="card" size={18} color="#0F6E56" />
            <span className="text-[13px] font-medium text-ink">Payme</span>
            {paymentMethod === 'payme' && <Icon name="circleCheck" size={15} color="#0F6E56" className="ml-auto" />}
          </button>
          <button
            onClick={() => setPaymentMethod('cash')}
            className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-[10px]"
            style={
            paymentMethod === 'cash' ?
            { border: '1.5px solid #BA7517', background: '#FAEEDA' } :
            { border: '0.5px solid #EAE7DF', background: '#fff' }
            }>
            
            <span className="text-base">💵</span>
            <span className="text-[13px] font-medium text-ink">Naqt</span>
            {paymentMethod === 'cash' && <Icon name="circleCheck" size={15} color="#BA7517" className="ml-auto" />}
          </button>
        </div>
        {paymentMethod === 'cash' && <div className="text-[11px] text-muted mt-2">Kuryerga naqd pul bilan to'laysiz</div>}
      </div>

      <div className="mx-4 mb-3 bg-surface border border-line rounded-card p-3.5">
        <Row label="Taomlar" value={formatSom(totalPrice())} />
        <Row label="Yetkazish" value={DELIVERY_FEE === 0 ? 'Bepul' : formatSom(DELIVERY_FEE)} />
        <Row label="Xizmat haqi" value={formatSom(SERVICE_FEE)} />
        <div className="border-t border-line mt-2.5 pt-2.5 flex justify-between">
          <span className="text-[15px] font-medium text-ink">Jami</span>
          <span className="text-[15px] font-medium text-ink">{formatSom(total)}</span>
        </div>
      </div>

      <div className="flex-1" />

      <div className="sticky bottom-0 bg-surface border-t border-line p-4">
        <button
          onClick={handlePlaceOrder}
          disabled={paying}
          className="w-full bg-brand-ink text-white text-[15px] font-medium py-3.5 rounded-xl active:scale-[0.99] transition-transform disabled:opacity-60">
          
          {paying ? 'Yuborilmoqda...' : `Buyurtmani rasmiylashtirish · ${formatSom(total)}`}
        </button>
      </div>

      {showAddressSheet &&
      <AddressSheet
        addresses={user.addresses}
        selectedId={selectedAddress?.id}
        onSelect={(id) => {
          setDefaultAddress(id);
          setShowAddressSheet(false);
        }}
        onAdd={(addr) => addAddress(addr)}
        onClose={() => setShowAddressSheet(false)} />

      }

      {showPhoneEdit &&
      <div
        onClick={() => setShowPhoneEdit(false)}
        className="fixed inset-0 z-[100] flex items-end justify-center"
        style={{ background: 'rgba(20,10,0,0.55)' }}>
        
          <div
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-[420px] bg-surface rounded-t-[22px] p-5 animate-sheet">
          
            <div className="text-base font-medium text-ink mb-3">Telefon raqamini kiriting</div>
            <input
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value)}
            inputMode="tel"
            placeholder="+998 90 123 45 67"
            autoFocus
            className="w-full box-border px-3.5 py-3.5 border border-line rounded-xl text-[16px] mb-3.5 outline-none text-center" />
          
            <button
            onClick={savePhone}
            disabled={phoneDraft.trim().length < 9}
            className="w-full bg-brand-ink text-white text-[15px] font-medium py-3.5 rounded-xl disabled:opacity-50">
            
              Saqlash
            </button>
          </div>
        </div>
      }
    </div>);

}

function Row({ label, value }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[13px] text-ink">{value}</span>
    </div>);

}
