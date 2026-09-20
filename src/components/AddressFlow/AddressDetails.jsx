import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { haptic } from '@/lib/telegram';
import { useT } from '@/i18n';

// Manzil turlari (Yandex Eda uslubида)
const LABELS = [
  { id: 'home', icon: 'house', labelKey: 'addrLabelHome' },
  { id: 'work', icon: 'briefcase', labelKey: 'addrLabelWork' },
  { id: 'other', icon: 'pin', labelKey: 'addrLabelOther' },
];

// 3-bosqich: manzil tafsilotlari (kirish, qavat, xonadon, izoh)
export function AddressDetails({ location, onSave, onBack }) {
  const t = useT();
  const [labelId, setLabelId] = useState('home');
  const [title, setTitle] = useState(t('addrLabelHome'));
  /*
   * ═══ UCHTA MAYDON O'RNIGA BITTA IZOH ═══
   *
   * Avval "Kirish", "Qavat", "Xonadon" alohida raqamli
   * maydonlar edi. Amalda mijozlar ularni to'ldirmasdi yoki
   * noto'g'ri to'ldirardi: ko'p uylarda kirish raqami yo'q,
   * ba'zilari mo'ljal yozishni xohlaydi, domofon kodi esa
   * hech qaysi maydonga sig'masdi.
   *
   * Endi bitta erkin maydon — kuryer uchun eng kerakli narsa
   * shu: mijoz o'z so'zlari bilan tushuntiradi.
   */
  const [note, setNote] = useState('');

  /*
   * ═══ MANZILNI QO'LDA TO'G'RILASH ═══
   *
   * Xarita manzilni TAXMINAN aniqlaydi: ko'cha nomi yoki uy
   * raqami noto'g'ri chiqishi mumkin (ayniqsa yangi mahallalarda).
   * Avval "O'zgartirish" faqat orqaga qaytarardi — mijoz nuqtani
   * qayta tanlashi kerak edi, lekin matnni tuzata olmasdi.
   *
   * Endi matn shu yerda tahrirlanadi. Koordinata O'ZGARMAYDI —
   * kuryer baribir aniq nuqtaga boradi, matn esa unga qo'shimcha
   * yordam beradi.
   */
  const [street, setStreet] = useState(location.street || '');
  const [city, setCity] = useState(location.city || '');
  const [editOpen, setEditOpen] = useState(false);
  const [draftStreet, setDraftStreet] = useState('');
  const [draftCity, setDraftCity] = useState('');

  const openEdit = () => {
    haptic();
    setDraftStreet(street);
    setDraftCity(city);
    setEditOpen(true);
  };

  const applyEdit = () => {
    haptic();
    const next = draftStreet.trim();
    if (next) setStreet(next);
    setCity(draftCity.trim());
    setEditOpen(false);
  };

  const pickLabel = (l) => {
    haptic();
    setLabelId(l.id);
    // "Boshqa" bo'lsa nomni foydalanuvchи yozadi
    if (l.id !== 'other') setTitle(t(l.labelKey));
    else setTitle('');
  };

  const save = () => {
    haptic();

    /*
     * `entrance/floor/flat` bo'sh qiymat bilan saqlanadi —
     * maydonlar olib tashlandi, lekin savat va server ularni
     * hali o'qiydi. Bo'sh bo'lgani uchun ular manzil matniga
     * ham, kuryerga ketadigan izohga ham ta'sir qilmaydi.
     * Shunday qilib eski ma'lumot tuzilmasi buzilmaydi.
     */
    onSave({
      title: title.trim() || 'Manzil',
      address: street,
      street,
      city,
      lat: location.lat,
      lng: location.lng,
      entrance: '', floor: '', flat: '',
      note: note.trim(),
      labelId,
    });
  };

  return (
    <div className="addrflow addrflow--details">
      <div className="addrflow__header">
        <button onClick={onBack} className="addrflow__back-btn" aria-label={t('back')}>
          <Icon name="arrowLeft" size={22} color="var(--ink)" />
        </button>
        <div>
          <h3 className="addrflow__header-title">{t('addressDetailsTitle')}</h3>
          <p className="addrflow__header-sub">{t('addressDetailsSubtitle')}</p>
        </div>
      </div>

      <div className="addr-details__scroll">
        {/*
          Tanlangan manzil — xarita rasmi bilan.
          "O'zgartirish" manzil MATNINI tahrirlash oynasini ochadi.
          Koordinata o'zgarmaydi — xarita nuqtasi joyida qoladi.
        */}
        <div className="addr-card">
          <div className="addr-card__body">
            <div className="addr-card__label">
              <Icon name="pin" size={16} color="var(--brand)" />
              <span>{t('address')}</span>
            </div>
            <div className="addr-card__street">{street}</div>
            {city && <div className="addr-card__city">{city}</div>}
          </div>

          <img className="addr-card__map" src="/address-map.jpg" alt="" aria-hidden="true" />

          <button type="button" onClick={openEdit} className="addr-card__edit">
            <Icon name="edit" size={14} color="var(--brand)" />
            <span>{t('editAddressBtn')}</span>
          </button>
        </div>

        {/* Manzil turi + nomi */}
        <div className="addr-details__row">
          <div className="addr-details__labels">
            {LABELS.map((l) => (
              <button
                key={l.id}
                onClick={() => pickLabel(l)}
                className={`addr-label ${labelId === l.id ? 'is-active' : ''}`}
                aria-label={t(l.labelKey)}
              >
                <Icon name={l.icon} size={20} color={labelId === l.id ? 'var(--brand)' : 'var(--muted)'} />
              </button>
            ))}
          </div>
          <div className="addr-details__field addr-details__field--grow">
            <label>{t('addressNameLabel')}</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('addressNameExample')} />
          </div>
        </div>

        {/* Kuryerga izoh — bitta erkin maydon */}
        <div className="addr-note">
          <div className="addr-note__head">
            <Icon name="info" size={18} color="var(--brand)" />
            <div className="addr-note__titles">
              <div className="addr-note__title">{t('courierNoteLabel')}</div>
              <div className="addr-note__sub">{t('courierNoteSub')}</div>
            </div>
            <span className="addr-note__badge">{t('courierNoteOptional')}</span>
          </div>

          <div className="addr-note__box">
            <Icon name="edit" size={16} color="var(--muted)" />
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              rows={3}
              maxLength={200}
              placeholder={t('courierNotePlaceholder')}
            />
            <span className="addr-note__count">{note.length}/200</span>
          </div>

          <div className="addr-note__tip">
            <Icon name="info" size={16} color="var(--brand)" />
            <span>{t('courierFindHint')}</span>
          </div>
        </div>
      </div>

      {/*
        Manzilni to'g'rilash oynasi. Koordinata o'zgarmaydi —
        faqat kuryerga ko'rinadigan MATN tahrirlanadi.
      */}
      {editOpen && (
        <div className="addr-edit" onClick={() => setEditOpen(false)}>
          <div className="addr-edit__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="addr-edit__title">{t('editStreetTitle')}</div>
            <p className="addr-edit__why">{t('editStreetWhy')}</p>

            <label className="addr-edit__label">{t('editStreetLabel')}</label>
            <input
              className="addr-edit__input"
              value={draftStreet}
              onChange={(e) => setDraftStreet(e.target.value.slice(0, 120))}
              placeholder={t('editStreetExample')}
              autoFocus
            />
            <div className="addr-edit__hint">{t('editStreetExample')}</div>

            <label className="addr-edit__label">{t('cityLabel')}</label>
            <input
              className="addr-edit__input"
              value={draftCity}
              onChange={(e) => setDraftCity(e.target.value.slice(0, 80))}
              placeholder="Toshkent"
            />

            <div className="addr-edit__actions">
              <button type="button" className="addr-edit__cancel"
                onClick={() => setEditOpen(false)}>
                {t('cancel')}
              </button>
              <button type="button" className="addr-edit__save"
                onClick={applyEdit} disabled={!draftStreet.trim()}>
                {t('saveChanges')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="addr-details__footer">
        <button onClick={save} className="addrflow__btn-primary">{t('saveAddressBtn')}</button>
      </div>
    </div>
  );
}
