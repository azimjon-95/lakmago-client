import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { LangSwitch } from '@/components/LangSwitch/LangSwitch';
import { useUser } from '@/store/user';
import { useT } from '@/i18n';
import { api } from '@/api';
import { getTelegram, haptic } from '@/lib/telegram';
import './Profile.css';

export function ProfilePage() {
  const navigate = useNavigate();
  const t = useT();
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

  function saveName() { updateUser({ firstName, lastName }); setEditingField(null); }
  function savePhone() { updateUser({ phone }); setEditingField(null); }
  function handleAddAddress() {
    addAddress({ title: addrTitle, address: addrText });
    setShowAddAddress(false); setAddrTitle('Uy'); setAddrText('');
  }

  return (
    <div className="app-shell profile">
      <header className="page-header">
        <button onClick={() => navigate('/')} aria-label={t('back')}><Icon name="arrowLeft" size={22} color="#F7F2EA" /></button>
        <h1>{t('profile')}</h1>
      </header>

      {/* Telegram karta */}
      <div className="profile-card">
        <div className="profile-card__avatar">{user.photoInitials}</div>
        <div className="profile-card__info">
          <div className="profile-card__name">{user.firstName} {user.lastName}</div>
          <div className="profile-card__id">
            {user.username && `@${user.username} · `}ID: {user.telegramId ?? '—'}
          </div>
        </div>
      </div>

      {/* Do'stlarni taklif qilish (referral) */}
      <ReferralCard />

      {/* Til tanlash */}
      <div className="profile-section">
        <div className="profile-section__label">{t('language')}</div>
        <LangSwitch />
      </div>

      {/* Shaxsiy */}
      {/* Bronlarim */}
      <div className="profile-section">
        <button onClick={() => navigate('/my-reservations')} className="profile-row">
          <Icon name="calendarPlus" size={18} color="#F5A524" />
          <div className="profile-row__body">
            <div className="profile-row__value">Bronlarim</div>
            <div className="profile-row__label">Stol bronlari tarixi</div>
          </div>
          <Icon name="chevronRight" size={18} color="#A99C8C" />
        </button>
      </div>

      <div className="profile-section">
        <div className="profile-section__label">{t('settings')}</div>

        {editingField === 'name' ? (
          <div className="profile-edit">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism" className="input-field" style={{ marginBottom: 8 }} />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" className="input-field" style={{ marginBottom: 10 }} />
            <div className="profile-edit__actions">
              <button onClick={() => setEditingField(null)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
              <button onClick={saveName} className="btn-primary" style={{ flex: 1.5 }}>{t('save')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setFirstName(user.firstName); setLastName(user.lastName); setEditingField('name'); }} className="profile-row">
            <Icon name="edit" size={18} color="#A99C8C" />
            <div className="profile-row__body">
              <div className="profile-row__value">{user.firstName} {user.lastName}</div>
              <div className="profile-row__label">{t('profile')}</div>
            </div>
            <Icon name="chevronRight" size={18} color="#A99C8C" />
          </button>
        )}

        {editingField === 'phone' ? (
          <div className="profile-edit" style={{ marginTop: 10 }}>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="input-field" style={{ marginBottom: 10 }} />
            <div className="profile-edit__actions">
              <button onClick={() => setEditingField(null)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
              <button onClick={savePhone} className="btn-primary" style={{ flex: 1.5 }}>{t('save')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setPhone(user.phone || ''); setEditingField('phone'); }} className={`profile-row ${user.phone ? '' : 'profile-row--required'}`} style={{ marginTop: 10 }}>
            <Icon name="phone" size={18} color={user.phone ? '#A99C8C' : '#F5A524'} />
            <div className="profile-row__body">
              <div className={`profile-row__value ${user.phone ? '' : 'profile-row__value--accent'}`}>{user.phone || t('empty')}</div>
              <div className="profile-row__label">Telefon</div>
            </div>
            <Icon name="chevronRight" size={18} color="#A99C8C" />
          </button>
        )}
      </div>

      {/* Manzillar */}
      <div className="profile-section">
        <div className="profile-section__label">{t('myAddresses')}</div>
        <div className="profile-addresses">
          {user.addresses.length === 0 && <div className="profile-addresses__empty">{t('empty')}</div>}
          {user.addresses.map((a) => (
            <div key={a.id} className={`profile-address ${a.id === user.defaultAddressId ? 'is-default' : ''}`}>
              <Icon name="pin" size={18} color={a.id === user.defaultAddressId ? '#F5A524' : '#A99C8C'} />
              <div className="profile-address__body">
                <div className="profile-address__title">
                  {a.title}
                  {a.id === user.defaultAddressId && <span className="profile-address__badge">✓</span>}
                </div>
                <div className="profile-address__text">{a.address}</div>
              </div>
              {a.id !== user.defaultAddressId && (
                <button onClick={() => setDefaultAddress(a.id)} className="profile-address__set">{t('save')}</button>
              )}
              <button onClick={() => removeAddress(a.id)} aria-label={t('close')}><Icon name="trash" size={16} color="#E14B42" /></button>
            </div>
          ))}
        </div>

        {showAddAddress ? (
          <div className="profile-edit" style={{ marginTop: 10 }}>
            <div className="profile-addr-types">
              {['Uy', 'Ish', 'Boshqa'].map((tp) => (
                <button key={tp} onClick={() => setAddrTitle(tp)} className={`profile-addr-type ${addrTitle === tp ? 'is-active' : ''}`}>{tp}</button>
              ))}
            </div>
            <input value={addrText} onChange={(e) => setAddrText(e.target.value)} placeholder="Ko'cha, uy, xonadon" autoFocus className="input-field" style={{ marginBottom: 10 }} />
            <div className="profile-edit__actions">
              <button onClick={() => setShowAddAddress(false)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
              <button onClick={handleAddAddress} disabled={addrText.trim().length < 5} className="btn-primary" style={{ flex: 1.5 }}>{t('add')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddAddress(true)} className="profile-add-address">
            <Icon name="plus" size={16} color="#A99C8C" /> {t('add')}
          </button>
        )}
      </div>

      <div style={{ flex: 1 }} />
      <BottomNav />
    </div>
  );
}

// Do'stlarni taklif qilish kartasi — havola, do'stlar soni, bonus balans
function ReferralCard() {
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getReferralInfo().then(setInfo).catch(() => {});
  }, []);

  const share = () => {
    haptic();
    if (!info?.referralLink) return;
    const text = `🍽 LokmaGo — mazali taomlar tez yetkazib beriladi!\n\nMening havolam orqali qo'shiling va bonus oling 👇`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(info.referralLink)}&text=${encodeURIComponent(text)}`;
    const tg = getTelegram();
    if (tg?.openTelegramLink) tg.openTelegramLink(shareUrl);
    else window.open(shareUrl, '_blank');
  };

  const copy = async () => {
    haptic();
    if (!info?.referralLink) return;
    try {
      await navigator.clipboard.writeText(info.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const som = (n) => (n ?? 0).toLocaleString('ru-RU').replace(/,/g, ' ');

  return (
    <div className="referral-card">
      <div className="referral-card__head">
        <div className="referral-card__title">
          <Icon name="users" size={18} color="#F5A524" /> Do'stlarni taklif qiling
        </div>
        {info?.reward > 0 && (
          <div className="referral-card__badge">+{som(info.reward)} so'm</div>
        )}
      </div>

      <p className="referral-card__desc">
        Har bir do'stingiz kanalga obuna bo'lиб qo'shilса — ikkalangizga ham bonus!
      </p>

      {/* Statistika */}
      <div className="referral-card__stats">
        <div className="referral-stat">
          <div className="referral-stat__value">{info?.referralCount ?? 0}</div>
          <div className="referral-stat__label">Taklif qilingan</div>
        </div>
        <div className="referral-stat">
          <div className="referral-stat__value">{som(info?.bonusBalance)}</div>
          <div className="referral-stat__label">Bonus (so'm)</div>
        </div>
      </div>

      {/* Amallar */}
      <div className="referral-card__actions">
        <button onClick={share} className="referral-card__share">
          <Icon name="send" size={16} color="#2A1500" /> Do'stlarga yuborish
        </button>
        <button onClick={copy} className="referral-card__copy">
          <Icon name={copied ? 'check' : 'copy'} size={16} color="#F7F2EA" />
        </button>
      </div>
    </div>
  );
}
