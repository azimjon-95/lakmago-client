import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { haptic } from '@/lib/telegram';

/*
 * ═══ QO'NG'IROQ OYNASI (Telegram Mini App uchun) ═══
 * Mini App ichida tel: havolasi ko'pincha jim bloklanadi. Shuning uchun:
 *   1) bosilganda avval to'g'ridan-to'g'ri tel: urinib ko'riladi (ishlasa — telefon qo'ng'iroq oynasi);
 *   2) sahifa joyida qolsa (qo'ng'iroq ochilmadi) — shu oyna chiqadi:
 *        • katta raqam + "Qo'ng'iroq qilish" (haqiqiy havola — foydalanuvchi o'zi bosadi);
 *        • "Nusxalash" — raqam xotiraga;
 *        • "Telegramga yuborish" — raqam botdan KONTAKT kartasi bo'lib keladi, kartadagi raqam bosilsa qo'ng'iroq;
 *   3) raqam YO'Q bo'lsa — boshqa holat: qo'llab-quvvatlash orqali bog'lanish.
 */
export const normPhone = (p) => {
  const d = String(p || '').replace(/[^\d+]/g, '');
  if (!d) return '';
  const digits = d.replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return digits.length >= 10 ? `+${digits}` : '';
};
/** +998 77 737 77 40 ko'rinishida */
export const prettyPhone = (p) => {
  const n = normPhone(p);
  const m = n.match(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/);
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : n;
};

/**
 * To'g'ridan-to'g'ri qo'ng'iroqni urinib ko'radi. Qo'ng'iroq oynasi ochilsa sahifa fonga o'tadi
 * (visibilitychange/blur/pagehide) — shunda true. Aks holda (jim bloklandi) `onFail` chaqiriladi.
 */
export function tryDial(phone, onFail) {
  const url = `tel:${normPhone(phone)}`;
  let left = false;
  const mark = () => { left = true; };
  const cleanup = () => {
    document.removeEventListener('visibilitychange', mark);
    window.removeEventListener('blur', mark);
    window.removeEventListener('pagehide', mark);
  };
  document.addEventListener('visibilitychange', mark);
  window.addEventListener('blur', mark);
  window.addEventListener('pagehide', mark);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch { /* quyida oyna ochiladi */ }
  setTimeout(() => { cleanup(); if (!left) onFail(); }, 900);
}

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* eski WebView — pastda */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy'); ta.remove();
    return ok;
  } catch { return false; }
}

export function CallSheet({ info, T, onClose, onSupport }) {
  // info: { name, phone, orderId, restaurant: boolean }
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const phone = normPhone(info?.phone);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const doCopy = async () => {
    haptic();
    const ok = await copyText(phone);
    setMsg(ok ? T.callCopied : T.callCopyFail);
  };
  const doTelegram = async () => {
    if (busy) return;
    haptic(); setBusy(true); setMsg('');
    try {
      await api.callRestaurant(info.orderId);
      setMsg(T.callSentTg);
    } catch (e) {
      setMsg(e?.code === 'NOT_ALLOWED' ? T.callAfterAccept : T.callSendFail);
    } finally { setBusy(false); }
  };

  return (
    <div className="ot-call" role="dialog" aria-modal="true" aria-label={info?.name} onClick={onClose}>
      <div className="ot-call__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="ot-call__x" onClick={onClose} aria-label={T.close}><Icon name="x" size={20} color="#555" /></button>
        <span className="ot-call__ico"><Icon name={phone ? 'phone' : 'headphones'} size={26} color="#fff" strokeWidth={2.3} /></span>
        <div className="ot-call__name">{info?.name}</div>

        {phone ? (
          <>
            <div className="ot-call__num">{prettyPhone(phone)}</div>
            <a className="ot-call__go" href={`tel:${phone}`} onClick={() => haptic()}>
              <Icon name="phone" size={18} color="#fff" strokeWidth={2.4} />{T.callNow}
            </a>
            <div className="ot-call__row">
              <button type="button" onClick={doCopy}><Icon name="copy" size={16} color="#111" />{T.callCopy}</button>
              {info?.restaurant && (
                <button type="button" onClick={doTelegram} disabled={busy}><Icon name="send" size={16} color="#111" />{T.callToTg}</button>
              )}
            </div>
            {msg && <div className="ot-call__msg" role="status">{msg}</div>}
          </>
        ) : (
          <>
            <p className="ot-call__nophone">{T.noPhone}</p>
            <p className="ot-call__alt">{T.callNoPhoneAlt}</p>
            <button type="button" className="ot-call__go ot-call__go--green" onClick={() => { haptic(); onClose(); onSupport(); }}>
              <Icon name="headphones" size={18} color="#fff" />{T.ask}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
