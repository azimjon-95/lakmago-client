import { useState } from 'react';
import { Icon } from './Icon';
import { MapAddressPicker } from './AddressFlow/MapAddressPicker';
import { useSheetDrag } from '@/hooks/useSheetDrag';
import { useModalBackClose } from '@/hooks/useModalBackClose';
import { haptic } from '@/lib/telegram';
import { hasValidCoords, toCoord } from '@/lib/addressCoords';
import { useT } from '@/i18n';
import './AddressFlow/AddressFlow.css';
import './AddressEditSheet.css';

/*
 * ═══════════════════════════════════════════════════════════
 * MAVJUD MANZILNI TAHRIRLASH
 * ═══════════════════════════════════════════════════════════
 *
 * Buyurtma tasdiqlash qadamida (OrderConfirmModal) mijoz "Tahrirlash"
 * ni bossa ochiladi. Avval manzilni faqat QO'SHISH mumkin edi —
 * xato yozilgan uy raqamini tuzatish uchun yangisini qo'shib,
 * eskisini tashlab ketish kerak edi.
 *
 * Tahrirlanadi: nomi (Uy/Ish/Boshqa), manzil matni, kuryerga izoh,
 * xaritadagi nuqta. `id` va tanlanganlik (default) o'zgarmaydi.
 *
 * ─── XARITA NUQTASI ───
 * Nuqta bo'lmasa (eski matnli manzil) — saqlab bo'lmaydi: yetkazishda
 * kuryerga aniq joy kerak. Shuning uchun bu oyna koordinatasiz
 * manzilni tuzatishning ham eng qisqa yo'li.
 *
 * Nuqta SURILSA manzil matni yangi joyning nomi bilan almashadi
 * (matn nuqtani tasvirlaydi). Nuqta deyarli joyida qolsa (≈15 m)
 * mijozning qo'lda yozgan matni SAQLANADI.
 *
 * Xarita ostidagi oyna (bu) ochiq qoladi: mijoz xaritadan
 * qaytganda yozgan izohi yo'qolmaydi.
 */

const LABELS = [
  { id: 'home', icon: 'house', labelKey: 'addrLabelHome' },
  { id: 'work', icon: 'briefcase', labelKey: 'addrLabelWork' },
  { id: 'other', icon: 'pin', labelKey: 'addrLabelOther' },
];

/** Ikki nuqta orasidagi masofa (metr) — haversine. */
function metersBetween(a, b) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function AddressEditSheet({ address, onSave, onClose }) {
  const t = useT();
  const { dragProps, overlayStyle } = useSheetDrag(onClose);

  const [labelId, setLabelId] = useState(address.labelId || 'other');
  const [title, setTitle] = useState(address.title || '');
  const [text, setText] = useState(address.address || address.street || '');
  const [city, setCity] = useState(address.city || '');
  const [note, setNote] = useState(address.note || '');
  const [point, setPoint] = useState(
    hasValidCoords(address) ? { lat: toCoord(address.lat), lng: toCoord(address.lng) } : null,
  );
  const [mapOpen, setMapOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Xarita ochiq bo'lsa — "orqaga" avval uni yopadi (yozilgan izoh yo'qolmaydi)
  useModalBackClose(mapOpen, () => setMapOpen(false));

  const textOk = text.trim().length >= 3;
  const canSave = textOk && Boolean(point) && !saving;

  const pickLabel = (l) => {
    haptic();
    setLabelId(l.id);
    // "Boshqa" — nomni mijoz o'zi yozadi
    setTitle(l.id === 'other' ? '' : t(l.labelKey));
  };

  const onMapPick = (loc) => {
    const next = { lat: toCoord(loc.lat), lng: toCoord(loc.lng) };
    if (next.lat === null || next.lng === null) { setMapOpen(false); return; }

    const moved = !point || metersBetween(point, next) > 15;
    setPoint(next);
    if (moved) {
      // Yangi joy — yangi manzil matni (bo'sh kelsa eskisi qoladi)
      const street = loc.street || loc.address;
      if (typeof street === 'string' && street.trim()) setText(street.trim());
      if (typeof loc.city === 'string') setCity(loc.city);
    }
    setMapOpen(false);
  };

  const save = async () => {
    if (!canSave) return;
    haptic();
    setSaving(true);
    setError('');
    try {
      const result = await onSave({
        title: title.trim() || t('addrLabelOther'),
        address: text.trim(),
        street: text.trim(),
        city: city.trim(),
        note: note.trim(),
        labelId,
        lat: point.lat,
        lng: point.lng,
      });
      if (result && result.ok === false) throw new Error('not-saved');
      onClose();
    } catch {
      setSaving(false);
      setError(t('addrEditSaveFailed'));
    }
  };

  return (
    <>
      <div className="aes-overlay" onClick={onClose} style={overlayStyle}>
        <div className="aes-sheet" onClick={(e) => e.stopPropagation()} {...dragProps}>
          <div className="aes-handle" />

          <div className="aes-head">
            <div className="aes-head__title">{t('addrEditTitle')}</div>
            <button type="button" onClick={onClose} className="aes-close" aria-label={t('close')}>
              <Icon name="x" size={18} color="var(--muted)" />
            </button>
          </div>

          <div className="aes-body">
            {/* Manzil turi + nomi */}
            <div className="aes-row">
              <div className="aes-labels">
                {LABELS.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => pickLabel(l)}
                    className={`aes-label ${labelId === l.id ? 'is-active' : ''}`}
                    aria-label={t(l.labelKey)}
                    aria-pressed={labelId === l.id}
                  >
                    <Icon name={l.icon} size={22} color={labelId === l.id ? 'var(--brand)' : 'var(--muted)'} />
                  </button>
                ))}
              </div>
              <label className="aes-field aes-field--grow">
                <span>{t('addressNameLabel')}</span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value.slice(0, 40))}
                  placeholder={t('addressNameExample')}
                />
              </label>
            </div>

            {/* Manzil matni */}
            <label className="aes-field">
              <span>{t('addrEditTextLabel')}</span>
              <input
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, 120))}
                placeholder={t('editStreetExample')}
                aria-invalid={!textOk}
              />
              {!textOk && <em className="aes-hint aes-hint--err">{t('addrEditTextTooShort')}</em>}
            </label>

            {/* Xarita nuqtasi */}
            <div className={`aes-point ${point ? 'is-set' : 'is-missing'}`}>
              <div className="aes-point__icon">
                <Icon name={point ? 'circleCheck' : 'info'} size={22} color={point ? 'var(--success, #1f9d55)' : '#b07d00'} />
              </div>
              <div className="aes-point__body">
                <div className="aes-point__title">{t('addrEditPointLabel')}</div>
                <div className="aes-point__sub">
                  {point ? t('addrEditPointSet') : t('addrEditPointMissing')}
                </div>
              </div>
              <button
                type="button"
                className="aes-point__btn"
                onClick={() => { haptic(); setMapOpen(true); }}
              >
                {point ? t('addrEditPointChange') : t('addrEditPointPick')}
              </button>
            </div>

            {/* Kuryerga izoh */}
            <label className="aes-field">
              <span>{t('courierNoteLabel')}</span>
              <textarea
                rows={3}
                maxLength={200}
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 200))}
                placeholder={t('courierNotePlaceholder')}
              />
              <em className="aes-hint">{note.length}/200</em>
            </label>

            {error && <div className="aes-error" role="alert">{error}</div>}
          </div>

          <div className="aes-actions">
            <button type="button" onClick={onClose} className="aes-btn aes-btn--ghost" disabled={saving}>
              {t('cancel')}
            </button>
            <button type="button" onClick={save} className="aes-btn aes-btn--primary" disabled={!canSave}>
              {saving ? t('loading') : t('saveChanges')}
            </button>
          </div>
        </div>
      </div>

      {/* Xarita — AddressFlow bilan bir xil to'liq ekran qobig'i (z-index 200,
          tahrirlash oynasidan yuqori). Tahrirlash oynasi ostida ochiq qoladi. */}
      {mapOpen && (
        <div className="addrflow-overlay">
          <MapAddressPicker
            start={point}
            onPick={onMapPick}
            onBack={() => setMapOpen(false)}
          />
        </div>
      )}
    </>
  );
}
