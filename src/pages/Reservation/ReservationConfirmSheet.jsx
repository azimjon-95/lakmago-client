import { Icon } from '@/components/Icon';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { haptic } from '@/lib/telegram';
import { formatSom, formatSomShort } from '@/lib/utils';
import { useUser } from '@/store/user';
import '@/components/OrderConfirmModal.css';

export const NOTE_MAX = 300;

/**
 * Bronni yuborishdan OLDINGI so'nggi tekshiruv ("Tasdiqlash" bosilganda serverga DARHOL ketmaydi).
 *
 * Mijoz ko'radi: restoran, qachon, nechta mehmon, kim nomiga (ism + telefon), tanlangan taomlar.
 * Har qator "O'zgartirish" bilan formaga qaytaradi (kiritilgan narsalar saqlanadi). Pastda restoranga
 * ketadigan qo'shimcha tavsif (izoh) — u restoran paneli, restoran boti va admin guruhiga boradi.
 * Yuborish faqat shu oynadagi "Tasdiqlash va yuborish" bilan.
 */
export function ReservationConfirmSheet({
  restaurantName, dateLabel, time, guests, name, phone,
  selected, total, note, onNoteChange,
  onClose, onEditForm, onSend, sending, error, t,
}) {
  const { dragProps, overlayStyle } = useSheetDrag(sending ? () => {} : onClose);
  useModalBackClose(!sending, onClose);
  const user = useUser((s) => s.user);
  const handle = user?.username ? `@${user.username}` : '';

  const addChip = (text) => {
    haptic();
    const base = note.trim();
    if (base.includes(text)) return;
    const next = base ? `${base}, ${text}` : text;
    onNoteChange(next.slice(0, NOTE_MAX));
  };
  // Chip matni belgisiz (emoji'siz) qo'shiladi — restoran uchun toza matn
  const plain = (s) => s.replace(/^[^\p{L}]+/u, '').trim();

  return (
    <div className="ocm-overlay" onClick={sending ? undefined : onClose} style={overlayStyle}>
      <div className="ocm-sheet rcs-sheet" onClick={(e) => e.stopPropagation()} {...dragProps} role="dialog" aria-modal="true">
        <div className="ocm-handle" />

        <div className="ocm-head">
          <div className="ocm-head__icon"><Icon name="calendarPlus" size={22} color="var(--brand)" /></div>
          <div className="ocm-head__title">{t('resvCheckTitle')}</div>
          <button onClick={onClose} className="ocm-close" aria-label={t('close')} disabled={sending}>
            <Icon name="x" size={16} color="var(--muted)" />
          </button>
        </div>

        <div className="rcs-scroll">
          <div className="rcs-restaurant">{restaurantName}</div>

          <div className="rcs-card">
            <Row icon="clock" label={t('resvWhen')} onEdit={onEditForm} editLabel={t('resvEdit')} disabled={sending}>
              {dateLabel}, <b>{time}</b>
            </Row>
            <Row icon="users" label={t('resvGuestsRow')} onEdit={onEditForm} editLabel={t('resvEdit')} disabled={sending}>
              <b>{guests}</b> {t('resvPeople')}
            </Row>
            <Row icon="user" label={t('resvWho')} onEdit={onEditForm} editLabel={t('resvEdit')} disabled={sending}>
              <b>{name}</b>
              <span className="rcs-sub">{phone}</span>
            </Row>
          </div>

          <div className="rcs-section">{t('resvDishesTitle')}</div>
          {selected.length === 0 ? (
            <div className="rcs-empty">{t('resvNoDishes')}</div>
          ) : (
            <div className="rcs-dishes">
              {selected.map(({ dish, qty }) => (
                <div key={dish.id || dish._id} className="rcs-dish">
                  <span className="rcs-dish__qty">{qty}×</span>
                  <span className="rcs-dish__name">{dish.name}</span>
                  <span className="rcs-dish__sum">{formatSomShort((dish.price || 0) * qty)}</span>
                </div>
              ))}
              <div className="rcs-dish rcs-dish--total">
                <span className="rcs-dish__name">{t('total')}</span>
                <span className="rcs-dish__sum">{formatSom(total)}</span>
              </div>
            </div>
          )}

          <label className="rcs-section" htmlFor="rcs-note">{t('resvNoteLabel')}</label>
          <div className="rcs-chips" data-sheet-nodrag>
            {['resvChipBirthday', 'resvChipKids', 'resvChipQuiet', 'resvChipWindow'].map((k) => (
              <button key={k} type="button" className="rcs-chip" disabled={sending} onClick={() => addChip(plain(t(k)))}>
                {t(k)}
              </button>
            ))}
          </div>
          <div className="rcs-note">
            <textarea
              id="rcs-note"
              data-sheet-nodrag
              value={note}
              onChange={(e) => onNoteChange(e.target.value.slice(0, NOTE_MAX))}
              placeholder={t('resvNotePlaceholder')}
              rows={2}
              maxLength={NOTE_MAX}
              disabled={sending}
              className="rcs-note__input"
            />
            <span className="rcs-note__count">{note.length}/{NOTE_MAX}</span>
          </div>

          <div className="rcs-trust">
            <Icon name="shieldCheck" size={18} color="var(--brand)" />
            <p>
              {user
                ? <>{[user.firstName, handle].filter(Boolean).join(' · ')}{(user.firstName || handle) ? '. ' : ''}{t('resvIdentityHint', { phone })}</>
                : t('resvIdentityGuest')}
            </p>
          </div>
        </div>

        {error && <div className="resv-error rcs-error" role="alert">{error}</div>}

        <div className="ocm-actions">
          <button onClick={onClose} className="ocm-btn ocm-btn--ghost" disabled={sending}>
            {t('resvBackEdit')}
          </button>
          <button onClick={() => { haptic(); onSend(); }} className="ocm-btn ocm-btn--primary" disabled={sending}>
            {sending ? t('resvSending') : t('resvConfirmSend')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, children, onEdit, editLabel, disabled }) {
  return (
    <div className="rcs-row">
      <div className="rcs-row__icon"><Icon name={icon} size={16} color="var(--muted)" /></div>
      <div className="rcs-row__body">
        <div className="rcs-row__label">{label}</div>
        <div className="rcs-row__value">{children}</div>
      </div>
      <button type="button" className="rcs-row__edit" onClick={() => { haptic(); onEdit(); }} disabled={disabled}>
        <Icon name="edit" size={13} color="var(--brand)" /> {editLabel}
      </button>
    </div>
  );
}
