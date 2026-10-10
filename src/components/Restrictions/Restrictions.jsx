import { useRestrictions } from '@/store/restrictions';
import { useT } from '@/i18n';
import { getTelegram } from '@/lib/telegram';
import { useLockBody } from './useLockBody';
import './Restrictions.css';

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' }) : '');

/*
 * ═══ HISOB BLOKLANGAN ═══
 * LokmaGo admini bloklagan mijoz ilovadan foydalana olmaydi: butun ekranli oyna,
 * admin yozgan sabab bilan. Server ham har so'rovni rad etadi (USER_BLOCKED).
 */
export function BlockedGate() {
  const blocked = useRestrictions((s) => s.blocked);
  const t = useT();
  if (!blocked) return null;
  return <BlockedScreen blocked={blocked} t={t} />;
}

function BlockedScreen({ blocked, t }) {
  useLockBody();
  return (
    <div className="rx-blocked" role="alertdialog" aria-modal="true" aria-labelledby="rx-blocked-title">
      <div className="rx-blocked__card">
        <div className="rx-blocked__icon" aria-hidden="true">⛔</div>
        <h1 id="rx-blocked-title" className="rx-blocked__title">{t('blockedTitle')}</h1>
        {blocked.reason && <p className="rx-blocked__reason">{blocked.reason}</p>}
        {blocked.at && <p className="rx-blocked__date">{fmtDate(blocked.at)}</p>}
        <p className="rx-blocked__text">{t('blockedText')}</p>
        {getTelegram()?.close && (
          <button type="button" className="rx-blocked__btn" onClick={() => getTelegram().close()}>{t('close')}</button>
        )}
      </div>
    </div>
  );
}

/*
 * ═══ NAQD TO'LOV O'CHIRILGAN ═══ — mijoz "Naqd" ni bosganda sababi ko'rsatiladi.
 */
export function CashLockedSheet({ info, onClose, onPickCard, cardAvailable }) {
  const t = useT();
  useLockBody();
  return (
    <div className="rx-sheet" onClick={onClose}>
      <div className="rx-sheet__panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="rx-cash-title">
        <div className="rx-sheet__icon" aria-hidden="true">💳</div>
        <h2 id="rx-cash-title" className="rx-sheet__title">{t('cashLockedTitle')}</h2>
        {info?.reason && <p className="rx-sheet__reason">{info.reason}</p>}
        <p className="rx-sheet__text">{t('cashLockedOnlyCard')}</p>
        {cardAvailable
          ? <button type="button" className="rx-sheet__btn" onClick={onPickCard}>{t('payByCardBtn')}</button>
          : <p className="rx-sheet__warn">{t('cardUnavailableNow')}</p>}
        <button type="button" className="rx-sheet__ghost" onClick={onClose}>{t('close')}</button>
      </div>
    </div>
  );
}
