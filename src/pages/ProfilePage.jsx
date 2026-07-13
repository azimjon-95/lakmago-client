import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { useUser } from '@/store/user';

export function ProfilePage() {
  const navigate = useNavigate();
  const user = useUser((s) => s.user);
  const updateUser = useUser((s) => s.updateUser);
  const addAddress = useUser((s) => s.addAddress);
  const removeAddress = useUser((s) => s.removeAddress);
  const setDefaultAddress = useUser((s) => s.setDefaultAddress);

  const [editingField, setEditingField] = useState(null);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrTitle, setAddrTitle] = useState('Uy');
  const [addrText, setAddrText] = useState('');

  function saveName() {
    updateUser({ firstName, lastName });
    setEditingField(null);
  }
  function savePhone() {
    updateUser({ phone });
    setEditingField(null);
  }
  function handleAddAddress() {
    addAddress({ title: addrTitle, address: addrText });
    setShowAddAddress(false);
    setAddrTitle('Uy');
    setAddrText('');
  }

  return (
    <div className="min-h-screen bg-canvas max-w-[420px] mx-auto flex flex-col">
      <div className="px-4 py-3.5 bg-surface flex items-center gap-3 border-b border-line">
        <button onClick={() => navigate('/')} aria-label="Orqaga">
          <Icon name="arrowLeft" size={22} color="#1A1A17" />
        </button>
        <div className="text-lg font-medium text-ink">Profil</div>
      </div>

      {/* Telegram karta */}
      <div className="m-4 bg-brand-ink rounded-2xl p-[18px] flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-full bg-brand-400 flex items-center justify-center text-brand-text font-medium text-xl">
          {user.photoInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-medium text-white">
            {user.firstName} {user.lastName}
          </div>
          <div className="text-xs text-brand-100 mt-0.5">
            {user.username && `@${user.username} · `}Telegram ID: {user.telegramId ?? '—'}
          </div>
        </div>
      </div>

      {/* Shaxsiy ma'lumotlar */}
      <div className="mx-4 mb-3">
        <div className="text-[13px] font-medium text-muted mb-2">Shaxsiy ma'lumotlar</div>

        {editingField === 'name' ?
        <div className="bg-surface border border-line rounded-card p-3.5 mb-2.5">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism" className="w-full box-border px-3 py-2.5 border border-line rounded-[10px] text-[16px] mb-2 outline-none" />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" className="w-full box-border px-3 py-2.5 border border-line rounded-[10px] text-[16px] mb-2.5 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setEditingField(null)} className="flex-1 bg-canvas text-muted text-[13px] font-medium py-2.5 rounded-[10px]">Bekor</button>
              <button onClick={saveName} className="flex-[1.5] bg-brand-ink text-white text-[13px] font-medium py-2.5 rounded-[10px]">Saqlash</button>
            </div>
          </div> :

        <button
          onClick={() => {setFirstName(user.firstName);setLastName(user.lastName);setEditingField('name');}}
          className="w-full bg-surface border border-line rounded-card p-3.5 flex items-center gap-3 text-left mb-2.5">
          
            <Icon name="edit" size={18} color="#9A9A94" />
            <div className="flex-1">
              <div className="text-[13px] font-medium text-ink">{user.firstName} {user.lastName}</div>
              <div className="text-[11px] text-muted">Ism va familiya</div>
            </div>
            <Icon name="chevronRight" size={18} color="#9A9A94" />
          </button>
        }

        {editingField === 'phone' ?
        <div className="bg-surface border border-line rounded-card p-3.5">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="w-full box-border px-3 py-2.5 border border-line rounded-[10px] text-[16px] mb-2.5 outline-none" />
            <div className="flex gap-2">
              <button onClick={() => setEditingField(null)} className="flex-1 bg-canvas text-muted text-[13px] font-medium py-2.5 rounded-[10px]">Bekor</button>
              <button onClick={savePhone} className="flex-[1.5] bg-brand-ink text-white text-[13px] font-medium py-2.5 rounded-[10px]">Saqlash</button>
            </div>
          </div> :

        <button
          onClick={() => {setPhone(user.phone || '');setEditingField('phone');}}
          className="w-full bg-surface rounded-card p-3.5 flex items-center gap-3 text-left"
          style={{ border: user.phone ? '0.5px solid #EAE7DF' : '1.5px solid #EF9F27' }}>
          
            <Icon name="phone" size={18} color={user.phone ? '#9A9A94' : '#EF9F27'} />
            <div className="flex-1">
              <div className="text-[13px] font-medium" style={{ color: user.phone ? '#1A1A17' : '#BA7517' }}>{user.phone || 'Kiritilmagan'}</div>
              <div className="text-[11px] text-muted">Telefon raqami</div>
            </div>
            <Icon name="chevronRight" size={18} color="#9A9A94" />
          </button>
        }
      </div>

      {/* Manzillar */}
      <div className="mx-4 mb-3">
        <div className="text-[13px] font-medium text-muted mb-2">Manzillarim</div>
        <div className="flex flex-col gap-2">
          {user.addresses.length === 0 &&
          <div className="text-xs text-muted text-center py-3">Hozircha manzil qo'shilmagan</div>
          }
          {user.addresses.map((a) =>
          <div
            key={a.id}
            className="bg-surface rounded-card p-3.5 flex items-center gap-3"
            style={{ border: a.id === user.defaultAddressId ? '1.5px solid #EF9F27' : '0.5px solid #EAE7DF' }}>
            
              <Icon name="pin" size={18} color={a.id === user.defaultAddressId ? '#BA7517' : '#9A9A94'} />
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-ink flex items-center gap-1">
                  {a.title}
                  {a.id === user.defaultAddressId &&
                <span className="text-[10px] text-[#BA7517] bg-brand-50 px-1.5 py-px rounded-md">Asosiy</span>
                }
                </div>
                <div className="text-[11px] text-muted overflow-hidden text-ellipsis whitespace-nowrap">{a.address}</div>
              </div>
              {a.id !== user.defaultAddressId &&
            <button onClick={() => setDefaultAddress(a.id)} className="text-[11px] text-[#BA7517] font-medium">
                  Asosiy qilish
                </button>
            }
              <button onClick={() => removeAddress(a.id)} aria-label="O'chirish">
                <Icon name="trash" size={16} color="#D85A30" />
              </button>
            </div>
          )}
        </div>

        {showAddAddress ?
        <div className="bg-surface border border-line rounded-card p-3.5 mt-2.5">
            <div className="flex gap-2 mb-2.5">
              {['Uy', 'Ish', 'Boshqa'].map((t) =>
            <button
              key={t}
              onClick={() => setAddrTitle(t)}
              className="flex-1 py-2 rounded-[10px] text-xs font-medium"
              style={addrTitle === t ? { background: '#411E00', color: '#FAEEDA' } : { background: '#F7F5F0', color: '#6B6B66' }}>
              
                  {t}
                </button>
            )}
            </div>
            <input
            value={addrText}
            onChange={(e) => setAddrText(e.target.value)}
            placeholder="Ko'cha, uy, xonadon"
            autoFocus
            className="w-full box-border px-3 py-2.5 border border-line rounded-[10px] text-[16px] mb-2.5 outline-none" />
          
            <div className="flex gap-2">
              <button onClick={() => setShowAddAddress(false)} className="flex-1 bg-canvas text-muted text-[13px] font-medium py-2.5 rounded-[10px]">Bekor</button>
              <button
              onClick={handleAddAddress}
              disabled={addrText.trim().length < 5}
              className="flex-[1.5] bg-brand-ink text-white text-[13px] font-medium py-2.5 rounded-[10px] disabled:opacity-50">
              
                Qo'shish
              </button>
            </div>
          </div> :

        <button
          onClick={() => setShowAddAddress(true)}
          className="mt-2.5 w-full border-2 border-dashed border-[#D3D1C7] rounded-xl p-3 text-muted text-[13px] font-medium flex items-center justify-center gap-1.5">
          
            <Icon name="plus" size={16} color="#6B6B66" /> Yangi manzil qo'shish
          </button>
        }
      </div>

      <div className="flex-1" />
      <div className="px-4 pb-3">
        <button
          onClick={() => navigate('/admin')}
          className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-surface border border-line">
          
          <Icon name="shieldCheck" size={18} color="#9A9A94" />
          <span className="text-[13px] text-muted">Admin panel (bannerlar)</span>
          <Icon name="chevronRight" size={16} color="#9A9A94" className="ml-auto" />
        </button>
      </div>
      <BottomNav />
    </div>);

}
