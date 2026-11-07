import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { LangSwitch } from '@/components/LangSwitch/LangSwitch';
import { useUser } from '@/store/user';
import { useT } from '@/i18n';
import { api } from '@/api';
import { getTelegram, haptic } from '@/lib/telegram';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { GuestHero } from '@/components/AuthGate/LokmaSignIn';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useCapabilities } from '@/lib/capabilities';
import { signOut } from '@/lib/session';
import './Profile.css';

export function ProfilePage() {
  const navigate = useNavigate();
  const favCount = useUser((st) =>
    (st.user.favorites?.restaurants?.length || 0) + (st.user.favorites?.dishes?.length || 0));

  const t = useT();
  const user = useUser((s) => s.user);
  const updateUser = useUser((s) => s.updateUser);
  const addAddress = useUser((s) => s.addAddress);
  const removeAddress = useUser((s) => s.removeAddress);
  const setDefaultAddress = useUser((s) => s.setDefaultAddress);

  /*
   * MEHMON (hali ro'yxatdan o'tmagan): Profil'ga kirganda kirish oynasi O'ZI ochiladi (sessiyada BIR marta —
   * yopib qo'ysa qayta bezovta qilinmaydi), sahifada esa "Profilingizni yarating" kartochkasi turadi.
   * authStatus 'failed' = tokeni yo'q mehmon (App.jsx); Telegram ichida bu holat deyarli uchramaydi.
   */
  const { ensureAuth, AuthGate } = useRequireAuth();
  const isGuest = useUser((s) => s.authStatus) === 'failed';
  useEffect(() => {
    if (!isGuest) return undefined;
    try { if (sessionStorage.getItem('lokma_profile_auth_prompt') === '1') return undefined; } catch { /* maxfiy rejim */ }
    const id = setTimeout(() => {
      try { sessionStorage.setItem('lokma_profile_auth_prompt', '1'); } catch { /* */ }
      ensureAuth({ reason: 'profile' });
    }, 500); // sahifa avval chizilsin
    return () => clearTimeout(id);
  }, [isGuest, ensureAuth]);

  const [editingField, setEditingField] = useState(null);
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrTitle, setAddrTitle] = useState('Uy');
  const [addrText, setAddrText] = useState('');

  /*
   * HISOB: chiqish (HAMMA mijoz uchun) va hisobni o'chirish (App Store 5.1.1(v)). O'chirish tugmasi FAQAT server
   * `capabilities.accountDeletion` desa va demo hisob bo'lmasa ko'rinadi (eski serverda yashirin — haqiqiy mijozlarga ta'sir yo'q).
   */
  const caps = useCapabilities();
  const isAuthed = useUser((s) => s.authStatus) === 'done';
  const [confirm, setConfirm] = useState(null);   // 'logout' | 'delete' | null
  const [busy, setBusy] = useState(false);
  const [accErr, setAccErr] = useState('');
  const closeConfirm = () => { if (!busy) { setConfirm(null); setAccErr(''); } };
  async function doLogout() {
    setBusy(true);
    try { await signOut(); } finally { setBusy(false); setConfirm(null); }
    navigate('/');
  }
  async function doDelete() {
    setBusy(true); setAccErr('');
    try {
      await api.deleteAccount();
      await signOut();
      setConfirm(null);
      navigate('/');
    } catch (e) {
      setAccErr(e?.status === 409 ? t('acc_delete_active') : t('acc_delete_fail'));
    } finally { setBusy(false); }
  }

  function saveName() { updateUser({ firstName, lastName }); setEditingField(null); }
  function savePhone() { updateUser({ phone }); setEditingField(null); }
  function handleAddAddress() {
    addAddress({ title: addrTitle, address: addrText });
    setShowAddAddress(false); setAddrTitle('Uy'); setAddrText('');
  }

  return (
    <div className="app-shell pf">
      {/* Yashil sarlavha: to'lqinli fon, orqaga tugma, katta avatar, Lokma Go Market sumkasi */}
      <section className="pf-hero">
        <img className="pf-hero__wave" src="/profile/hero-wave.webp" alt="" aria-hidden="true" />
        <div className="pf-top">
          <button type="button" className="pf-back" onClick={() => navigate('/')} aria-label={t('back')}>
            <Icon name="arrowLeft" size={20} color="#fff" />
          </button>
          <h1 className="pf-top__title">{t('profile')}</h1>
        </div>

        {!isGuest && (
          <>
            <div className="pf-avatar">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              ) : (
                <span>{user.photoInitials}</span>
              )}
              <button type="button" className="pf-avatar__edit"
                onClick={() => { setFirstName(user.firstName); setLastName(user.lastName); setEditingField('name'); }}
                aria-label="Tahrirlash">
                <Icon name="edit" size={14} color="#fff" />
              </button>
            </div>
            <div className="pf-name">{user.firstName} {user.lastName}</div>
            <div className="pf-id">{user.username ? `@${user.username}` : `ID: ${user.telegramId ?? '—'}`}</div>
          </>
        )}
        <img className="pf-bag" src="/profile/bag.webp" alt="" aria-hidden="true" />
      </section>

      {isGuest ? (
        <GuestHero onSignIn={() => ensureAuth({ reason: 'profile' })} />
      ) : (
        <>
          {/* Tez statistika: manzil va sevimlilar */}
          <div className="pf-stats">
            <div className="pf-stat">
              <span className="pf-stat__ic pf-stat__ic--green"><Icon name="pin" size={17} color="#148A43" /></span>
              <div>
                <span className="pf-stat__value">{user.addresses?.length || 0}</span>
                <span className="pf-stat__label">{t('address')}</span>
              </div>
            </div>
            <span className="pf-stats__sep" aria-hidden="true" />
            <div className="pf-stat">
              <span className="pf-stat__ic pf-stat__ic--red"><Icon name="heart" size={17} color="#E5484D" /></span>
              <div>
                <span className="pf-stat__value">{favCount}</span>
                <span className="pf-stat__label">{t('favorites')}</span>
              </div>
            </div>
          </div>

          {/* Do'stlarni taklif qilish (referal) */}
          <ReferralCard />
        </>
      )}

      {/* Til */}
      <div className="pf-section">
        <div className="pf-section__label">{t('language')}</div>
        <LangSwitch />
      </div>

      {/* Tez havolalar */}
      <div className="pf-section">
        <div className="pf-group">
          <button type="button" onClick={() => navigate('/favorites')} className="pf-row">
            <span className="pf-row__ic pf-row__ic--red"><Icon name="heart" size={18} color="#E5484D" /></span>
            <span className="pf-row__body">
              <span className="pf-row__value">{t('favoritesTitle')}</span>
              <span className="pf-row__label">{t('favoritesHint')}</span>
            </span>
            <Icon name="chevronRight" size={17} color="#9AA3A0" />
          </button>
          <button type="button" onClick={() => navigate('/my-reservations')} className="pf-row">
            <span className="pf-row__ic pf-row__ic--orange"><Icon name="calendarPlus" size={18} color="#F26B1D" /></span>
            <span className="pf-row__body">
              <span className="pf-row__value">{t('myReservations')}</span>
              <span className="pf-row__label">{t('myReservationsHint')}</span>
            </span>
            <Icon name="chevronRight" size={17} color="#9AA3A0" />
          </button>
        </div>
      </div>

      {/* Sozlamalar */}
      <div className="pf-section">
        <div className="pf-section__label">{t('settings')}</div>
        <div className="pf-group">
          {editingField === 'name' ? (
            <div className="pf-edit">
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t('firstNamePlaceholder')} className="input-field" style={{ marginBottom: 8 }} />
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder={t('lastNamePlaceholder')} className="input-field" style={{ marginBottom: 10 }} />
              <div className="pf-edit__actions">
                <button onClick={() => setEditingField(null)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
                <button onClick={saveName} className="btn-primary" style={{ flex: 1.5 }}>{t('save')}</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setFirstName(user.firstName); setLastName(user.lastName); setEditingField('name'); }} className="pf-row">
              <span className="pf-row__ic pf-row__ic--green"><Icon name="edit" size={18} color="#148A43" /></span>
              <span className="pf-row__body">
                <span className="pf-row__value">{user.firstName} {user.lastName}</span>
                <span className="pf-row__label">{t('profile')}</span>
              </span>
              <Icon name="chevronRight" size={17} color="#9AA3A0" />
            </button>
          )}

          {editingField === 'phone' ? (
            <div className="pf-edit">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="input-field" style={{ marginBottom: 10 }} />
              <div className="pf-edit__actions">
                <button onClick={() => setEditingField(null)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
                <button onClick={savePhone} className="btn-primary" style={{ flex: 1.5 }}>{t('save')}</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => { setPhone(user.phone || ''); setEditingField('phone'); }}
              className={`pf-row ${user.phone ? '' : 'pf-row--required'}`}>
              <span className="pf-row__ic pf-row__ic--blue"><Icon name="phone" size={18} color="#2F8FD8" /></span>
              <span className="pf-row__body">
                <span className={`pf-row__value ${user.phone ? '' : 'pf-row__value--accent'}`}>{user.phone || t('empty')}</span>
                <span className="pf-row__label">{t('phoneLabel')}</span>
              </span>
              <Icon name="chevronRight" size={17} color="#9AA3A0" />
            </button>
          )}
        </div>
      </div>

      {/* Manzillar */}
      <div className="pf-section">
        <div className="pf-section__label">{t('myAddresses')}</div>
        <div className="pf-group">
          {user.addresses.length === 0 && <div className="pf-empty">{t('empty')}</div>}
          {user.addresses.map((a) => {
            const isDef = a.id === user.defaultAddressId;
            return (
              <div key={a.id} className={`pf-addr ${isDef ? 'is-default' : ''}`}>
                <span className="pf-row__ic pf-row__ic--green"><Icon name="pin" size={18} color="#148A43" /></span>
                <div className="pf-addr__body">
                  <div className="pf-addr__title">
                    {a.title}
                    {isDef && <span className="pf-addr__badge">✓</span>}
                  </div>
                  <div className="pf-addr__text">{a.address}</div>
                </div>
                {!isDef && <button type="button" onClick={() => setDefaultAddress(a.id)} className="pf-addr__set">{t('save')}</button>}
                <button type="button" className="pf-addr__del" onClick={() => removeAddress(a.id)} aria-label={t('close')}>
                  <Icon name="trash" size={16} color="#DC2626" />
                </button>
              </div>
            );
          })}
        </div>

        {showAddAddress ? (
          <div className="pf-edit pf-edit--card" style={{ marginTop: 10 }}>
            <div className="pf-addr-types">
              {['Uy', 'Ish', 'Boshqa'].map((tp) => (
                <button key={tp} type="button" onClick={() => setAddrTitle(tp)} className={`pf-addr-type ${addrTitle === tp ? 'is-active' : ''}`}>{tp}</button>
              ))}
            </div>
            <input value={addrText} onChange={(e) => setAddrText(e.target.value)} placeholder="Ko'cha, uy, xonadon" autoFocus className="input-field" style={{ marginBottom: 10 }} />
            <div className="pf-edit__actions">
              <button onClick={() => setShowAddAddress(false)} className="btn-secondary" style={{ flex: 1 }}>{t('cancel')}</button>
              <button onClick={handleAddAddress} disabled={addrText.trim().length < 5} className="btn-primary" style={{ flex: 1.5 }}>{t('add')}</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAddAddress(true)} className="pf-add">
            <span className="pf-add__plus"><Icon name="plus" size={15} color="#148A43" /></span>
            {t('add')}
          </button>
        )}
      </div>

      {/* Hisob: chiqish va (ruxsat bo'lsa) hisobni o'chirish */}
      {isAuthed && (
        <div className="pf-section">
          <div className="pf-section__label">{t('acc_title')}</div>
          {user.isDemo && <p className="pf-demo-note" data-testid="profile-demo-note">{t('demo_profile_note')}</p>}
          <div className="pf-group">
            <button type="button" onClick={() => setConfirm('logout')} className="pf-row" data-testid="logout-row">
              <span className="pf-row__ic pf-row__ic--green"><Icon name="logout" size={18} color="#148A43" /></span>
              <span className="pf-row__body"><span className="pf-row__value">{t('logout')}</span></span>
              <Icon name="chevronRight" size={17} color="#9AA3A0" />
            </button>
            {caps.accountDeletion && (!user.isDemo || caps.demoAccountDeletion) && (
              <button type="button" onClick={() => setConfirm('delete')} className="pf-row" data-testid="delete-row">
                <span className="pf-row__ic pf-row__ic--red"><Icon name="trash" size={18} color="#DC2626" /></span>
                <span className="pf-row__body">
                  <span className="pf-row__value" style={{ color: '#DC2626' }}>{t('acc_delete')}</span>
                  <span className="pf-row__label">{t('acc_delete_hint')}</span>
                </span>
                <Icon name="chevronRight" size={17} color="#9AA3A0" />
              </button>
            )}
          </div>
        </div>
      )}

      {confirm === 'logout' && (
        <ConfirmDialog title={t('acc_logout_title')} body={t('acc_logout_sub')} confirmLabel={t('logout')} cancelLabel={t('cancel')}
          busy={busy} onConfirm={doLogout} onCancel={closeConfirm} />
      )}
      {confirm === 'delete' && (
        <ConfirmDialog danger title={t('acc_delete_title')} body={user.isDemo ? t('acc_delete_body_demo') : t('acc_delete_body')} confirmLabel={t('acc_delete_yes')} cancelLabel={t('cancel')}
          busy={busy} error={accErr} onConfirm={doDelete} onCancel={closeConfirm} />
      )}

      <div style={{ flex: 1 }} />
      <BottomNav />
      {AuthGate}
    </div>
  );
}

// Do'stlarni taklif qilish kartasi — havola, do'stlar soni, bonus balans
function ReferralCard() {
  const t = useT();
  const [info, setInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.getReferralInfo().then(setInfo).catch(() => {});
  }, []);

  const share = () => {
    haptic();
    if (!info?.referralLink) return;
    const text = t('referralShareText');
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
    <div className="pf-ref">
      <img className="pf-ref__banner" src="/profile/referral-bg.webp" alt="" aria-hidden="true" />
      <div className="pf-ref__head">
        <div className="pf-ref__title">
          <span className="pf-ref__ic"><Icon name="users" size={18} color="#F26B1D" /></span>
          {t('referralTitle')}
        </div>
        {info?.reward > 0 && <div className="pf-ref__badge">+{som(info.reward)} {t('ball')}</div>}
      </div>

      <p className="pf-ref__desc">{t('referralDesc')}</p>

      {/* Statistika */}
      <div className="pf-ref__stats">
        <div className="pf-ref__stat">
          <span className="pf-ref__value">{info?.referralCount ?? 0}</span>
          <span className="pf-ref__label">{t('referralInvited')}</span>
        </div>
        <div className="pf-ref__stat">
          {/*
            `referralPoints` — YANGI maydon, `bonusBalance` EMAS.
            Taklif mukofoti endi ball (pul emas) va alohida
            maydonda saqlanadi (server: models/User.js, services/referral.js).
          */}
          <span className="pf-ref__value">{som(info?.referralPoints)}</span>
          <span className="pf-ref__label">{t('referralBonusLabel')}</span>
        </div>
      </div>

      {/* Amallar */}
      <div className="pf-ref__actions">
        <button type="button" onClick={share} className="pf-ref__share">
          <Icon name="send" size={16} color="#fff" /> {t('referralShareBtn')}
        </button>
        <button type="button" onClick={copy} className="pf-ref__copy" aria-label="Nusxalash">
          <Icon name={copied ? 'check' : 'copy'} size={16} color="#1F2A24" />
        </button>
      </div>
    </div>
  );
}

// Plastik kartalar slaydi — yonma-yon suriladi
