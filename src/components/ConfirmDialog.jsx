import { useEffect } from 'react';
import './ConfirmDialog.css';

/*
 * Tasdiqlash oynasi (chiqish, hisobni o'chirish). `busy` paytida yopilmaydi; xato matni oyna ichida ko'rinadi.
 * Pastdan chiqadi (telefonda bosish oson), Escape va fonga bosish — bekor qilish.
 */
export function ConfirmDialog({ title, body, confirmLabel, cancelLabel, danger = false, busy = false, error = '', onConfirm, onCancel }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);
  return (
    <div className="cdlg-overlay" onClick={() => { if (!busy) onCancel(); }} data-testid="confirm-overlay">
      <div className="cdlg" role="alertdialog" aria-modal="true" aria-labelledby="cdlg-title" aria-describedby="cdlg-body" onClick={(e) => e.stopPropagation()}>
        <h2 id="cdlg-title" className="cdlg__title">{title}</h2>
        <p id="cdlg-body" className="cdlg__body">{body}</p>
        {error && <p className="cdlg__error" role="alert">{error}</p>}
        <div className="cdlg__actions">
          <button type="button" className="cdlg__btn" onClick={onCancel} disabled={busy}>{cancelLabel}</button>
          <button type="button" className={`cdlg__btn cdlg__btn--primary${danger ? ' cdlg__btn--danger' : ''}`} onClick={onConfirm} disabled={busy} data-testid="confirm-yes">
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
