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
  const [cards, setCards] = useState([]);
  const cardCount = cards.length;
  const favCount = useUser((st) =>
    (st.user.favorites?.restaurants?.length || 0) + (st.user.favorites?.dishes?.length || 0));

  useEffect(() => {
    api.getCards().then((l) => setCards(Array.isArray(l) ? l : [])).catch(() => {});
  }, []);
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

      {/* Hero — gradient fon, Telegram rasmi */}
      <div className="profile-hero">
        <div className="profile-hero__glow" />
        <div className="profile-hero__avatar">
          {user.photoUrl ? (
            <img
              src={user.photoUrl}
              alt=""
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <span>{user.photoInitials}</span>
          )}
        </div>
        <div className="profile-hero__name">
          {user.firstName} {user.lastName}
        </div>
        <div className="profile-hero__id">
          {user.username ? `@${user.username}` : `ID: ${user.telegramId ?? '—'}`}
        </div>

        {/* Tez statistika */}
        <div className="profile-hero__stats">
          <div className="profile-stat">
            <span className="profile-stat__value">{cardCount}</span>
            <span className="profile-stat__label">Karta</span>
          </div>
          <span className="profile-stat__sep" />
          <div className="profile-stat">
            <span className="profile-stat__value">{user.addresses?.length || 0}</span>
            <span className="profile-stat__label">Manzil</span>
          </div>
          <span className="profile-stat__sep" />
          <div className="profile-stat">
            <span className="profile-stat__value">{favCount}</span>
            <span className="profile-stat__label">Sevimli</span>
          </div>
        </div>
      </div>

      {/* Kartalar slaydi */}
      <CardsStrip cards={cards} onManage={() => navigate('/cards')} />

      {/* Do'stlarni taklif qilish (referral) */}
      <ReferralCard />

      {/* Til tanlash */}
      <div className="profile-section">
        <div className="profile-section__label">{t('language')}</div>
        <LangSwitch />
      </div>

      {/* Tez havolalar — bitta guruhda */}
      <div className="profile-section">
        <div className="profile-list">
          <button onClick={() => navigate('/favorites')} className="profile-row">
            <Icon name="heart" size={18} color="#F5A524" />
            <div className="profile-row__body">
              <div className="profile-row__value">Sevimlilar</div>
              <div className="profile-row__label">Saqlangan taom va restoranlar</div>
            </div>
            <Icon name="chevronRight" size={17} color="#A99C8C" />
          </button>

          <button onClick={() => navigate('/my-reservations')} className="profile-row">
            <Icon name="calendarPlus" size={18} color="#F5A524" />
            <div className="profile-row__body">
              <div className="profile-row__value">Bronlarim</div>
              <div className="profile-row__label">Stol bronlari tarixi</div>
            </div>
            <Icon name="chevronRight" size={17} color="#A99C8C" />
          </button>
        </div>
      </div>

      <div className="profile-section">
        <div className="profile-section__label">{t('settings')}</div>

        <div className="profile-list">
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
          <div className="profile-edit">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="input-field" style={{ marginBottom: 10 }} />
            <div className="profile-edit__actions">
              <button onClick={() => setEditingField(null)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
              <button onClick={savePhone} className="btn-primary" style={{ flex: 1.5 }}>{t('save')}</button>
            </div>
          </div>
        ) : (
          <button onClick={() => { setPhone(user.phone || ''); setEditingField('phone'); }} className={`profile-row ${user.phone ? '' : 'profile-row--required'}`}>
            <Icon name="phone" size={18} color={user.phone ? '#A99C8C' : '#F5A524'} />
            <div className="profile-row__body">
              <div className={`profile-row__value ${user.phone ? '' : 'profile-row__value--accent'}`}>{user.phone || t('empty')}</div>
              <div className="profile-row__label">Telefon</div>
            </div>
            <Icon name="chevronRight" size={17} color="#A99C8C" />
          </button>
        )}
        </div>
      </div>

      {/* Manzillar */}
      <div className="profile-section">
        <div className="profile-section__label">{t('myAddresses')}</div>
        <div className="profile-list">
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

  // Admin panelda o'chirilgan bo'lsa karta ko'rsatilmaydi
  if (info && info.enabled === false) return null;

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

// Plastik kartalar slaydi — yonma-yon suriladi
const CARD_STYLES = {
  uzcard: { grad: 'linear-gradient(135deg, #0A5C8F 0%, #00A3E0 100%)', label: 'UzCard' },
  humo: { grad: 'linear-gradient(135deg, #005E58 0%, #00B2A9 100%)', label: 'Humo' },
  visa: { grad: 'linear-gradient(135deg, #12175E 0%, #2A3BA8 100%)', label: 'VISA' },
  mastercard: { grad: 'linear-gradient(135deg, #7A0D12 0%, #EB4B2A 100%)', label: 'Mastercard' },
  card: { grad: 'linear-gradient(135deg, #3D2A10 0%, #6B4A1C 100%)', label: 'Karta' },
};

function CardsStrip({ cards, onManage }) {
  if (!cards.length) {
    return (
      <button onClick={onManage} className="pcards-empty">
        <Icon name="card" size={20} color="#F5A524" />
        <div className="pcards-empty__body">
          <div className="pcards-empty__title">To'lov kartasi qo'shing</div>
          <div className="pcards-empty__hint">To'lovda tezroq bo'ladi</div>
        </div>
        <Icon name="plus" size={18} color="#F5A524" />
      </button>
    );
  }

  return (
    <div className="pcards">
      <div className="pcards__row no-scrollbar">
        {cards.map((c) => {
          const st = CARD_STYLES[c.brand] || CARD_STYLES.card;
          return (
            <div key={c._id} className="pcard" style={{ background: st.grad }}>
              <div className="pcard__shine" />
              <div className="pcard__top">
                <span className="pcard__chip" />
                {c.isDefault && <span className="pcard__badge">Asosiy</span>}
              </div>
              <div className="pcard__num">•••• {c.last4}</div>
              <div className="pcard__bottom">
                <span className="pcard__holder">
                  {c.bankName || c.holder || 'KARTA EGASI'}
                </span>
                <span className="pcard__brand">{st.label}</span>
              </div>
            </div>
          );
        })}

        {/* Qo'shish kartasi */}
        <button onClick={onManage} className="pcard pcard--add">
          <Icon name="plus" size={24} color="#F5A524" />
          <span>Qo'shish</span>
        </button>
      </div>
    </div>
  );
}
