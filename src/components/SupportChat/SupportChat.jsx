import { useState, useRef, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import '@fontsource/inter-tight/800.css';
import { useT, useI18n } from '@/i18n';
import './SupportChat.css';
import { OperatorAvatar } from './OperatorAvatar';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { getSocket, joinUserRoom } from '@/lib/socket';
import { useUser } from '@/store/user';
import { useLockScroll } from '@/hooks/useLockScroll';
import { useModalBackClose } from '@/hooks/useModalBackClose';

/*
 * ═══ LOKMA GO — YORDAM XIZMATI ═══
 *
 * Dizayn (maket): krem to'lqinli varaq, ustida operator (rasm varaq chetidan chiqib turadi), "Lokma Go / yordam
 * xizmatiga xush kelibsiz!", o'rtada CHAT, "♥ Sizga yordam berishdan mamnunmiz!" va to'q sariq kiritish maydoni.
 *
 * Chat:
 *  • Ochilishi bilan operator "yozmoqda…" (3 nuqta), so'ng salomlashuv HARFMA-HARF yoziladi (sun'iy intellekt kabi
 *    yumshoq: tinish belgilarida tabiiy to'xtash). Vaqti — mijoz KIRGAN payt.
 *  • Har bir xabarda BIR XIL formatdagi vaqt (HH:MM, 24 soatlik, qurilma vaqti) va kun ajratgichi (Bugun / Kecha / sana).
 *  • Jonli kelgan javob ham qisqa "yozmoqda" bilan, tez yoziladi; tarix esa darhol ko'rinadi.
 *  • Klaviatura ochilsa yoki yozishmalar ko'payib ekranga sig'masa — operator rasmi yumshoq yig'iladi (ixcham rejim),
 *    chatga joy beriladi. "Harakatni kamaytirish" yoqilgan bo'lsa animatsiyalar o'chadi.
 * Ochish: FAB tugmasi yoki window.dispatchEvent(new Event('lokma:open-support')).
 */

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pad2 = (n) => String(n).padStart(2, '0');
/** Har joyda BIR XIL vaqt formati: 07:39 */
export const hhmm = (d) => { const x = new Date(d); return Number.isNaN(x.getTime()) ? '' : `${pad2(x.getHours())}:${pad2(x.getMinutes())}`; };
const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`; };
function dayLabel(d, t) {
  const x = new Date(d); const now = new Date();
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (dayKey(x) === dayKey(now)) return t('supToday');
  if (dayKey(x) === dayKey(y)) return t('supYesterday');
  return `${pad2(x.getDate())}.${pad2(x.getMonth() + 1)}.${x.getFullYear()}`;
}

/** Harfma-harf yozish. Tinish belgilarida tabiiy to'xtaydi; `fast` — jonli javoblar uchun (jami ~1.2 s dan oshmaydi). */
function useTypewriter(text, run, fast = false) {
  // 0 dan boshlanadi: aks holda "to'liq yozildi" tekshiruvi animatsiya boshlanmasdan ishlab ketardi
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return undefined;
    setN(0);
    let i = 0; let timer;
    const base = fast ? Math.min(18, 1200 / Math.max(text.length, 1)) : 24;
    const step = () => {
      i += 1; setN(i);
      if (i >= text.length) return;
      const ch = text[i - 1];
      const pause = fast ? 0 : ('!?.'.includes(ch) ? 260 : ch === ',' ? 140 : 0);
      timer = setTimeout(step, base + (fast ? 0 : Math.random() * 18) + pause);
    };
    timer = setTimeout(step, 60);
    return () => clearTimeout(timer);
  }, [text, run, fast]);
  return Math.min(n, text.length);
}

function TypingDots() {
  return <span className="sc-dots" aria-hidden="true"><i /><i /><i /></span>;
}

/** Bitta xabar. typing=true bo'lsa: avval "yozmoqda", so'ng harfma-harf. */
function Bubble({ msg, typing, fast, onTyped, t }) {
  const [stage, setStage] = useState(typing && !reduceMotion() ? 'dots' : 'done');
  useEffect(() => {
    if (stage !== 'dots') return undefined;
    const id = setTimeout(() => setStage('typing'), fast ? 450 : 900);
    return () => clearTimeout(id);
  }, [stage, fast]);
  const n = useTypewriter(msg.text, stage === 'typing', fast);
  useEffect(() => {
    if (stage === 'typing' && msg.text.length > 0 && n >= msg.text.length) { setStage('done'); onTyped?.(); }
  }, [n, stage, msg.text.length, onTyped]);
  const shown = stage === 'done' ? msg.text : msg.text.slice(0, n);
  useEffect(() => { onTyped?.(); }, [n]); // eslint-disable-line react-hooks/exhaustive-deps -- yozilayotganda pastga suriladi

  const mine = msg.from === 'user';
  if (stage === 'dots') {
    return <div className="sc-msg sc-msg--support sc-msg--typing" aria-label={t('supTyping')}><TypingDots /></div>;
  }
  return (
    <div className={`sc-msg sc-msg--${mine ? 'user' : 'support'}${msg.failed ? ' sc-msg--failed' : ''}`}>
      <span className="sc-msg__text" aria-hidden={stage !== 'done'}>
        {shown}
        {stage !== 'done' && <span className="sc-caret" />}
      </span>
      {stage !== 'done' && <span className="sc-sr">{msg.text}</span>}
      <span className={`sc-msg__meta${stage === 'done' ? ' is-on' : ''}`}>
        {msg.edited && <span className="sc-msg__edited">{t('supEdited')}</span>}
        <time dateTime={Number.isNaN(new Date(msg.at).getTime()) ? undefined : new Date(msg.at).toISOString()}>{hhmm(msg.at)}</time>
      </span>
    </div>
  );
}

export function SupportChat({ hideFab = false } = {}) {
  const t = useT();
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('lokma:open-support', onOpen);
    return () => window.removeEventListener('lokma:open-support', onOpen);
  }, []);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);   // { id, from, text, at, history?, fresh?, failed?, edited? }
  const [greetAt, setGreetAt] = useState(null);   // mijoz KIRGAN payt — salomlashuv vaqti
  const [focused, setFocused] = useState(false);
  const [latched, setLatched] = useState(false);  // yozishmalar sig'may qolgan — ixcham rejim yopilguncha saqlanadi
  const bodyRef = useRef(null);
  const inputRef = useRef(null);
  const blurTimer = useRef(null);
  // Tugma bosilganda input fokusini yo'qotmaydi (Telegram kabi: klaviatura ochiq qoladi, maket siljimaydi)
  const keepFocus = (e) => e.preventDefault();

  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  useLockScroll(open);
  const close = useCallback(() => {
    if (reduceMotion()) { setOpen(false); return; }
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 260);
  }, []);
  useModalBackClose(open, close);
  const userId = useUser((st) => st.user?._id || st.user?.id);

  /*
   * "Online" holati — Telegram kabi (admin qo'llab-quvvatlash sahifasida faol bo'lsa — online).
   */
  const [presence, setPresence] = useState({ online: false, lastSeenAt: null });
  const [, forceTick] = useState(0);
  useEffect(() => {
    let dead = false;
    api.getSupportPresence().then((p) => { if (!dead) setPresence(p); }).catch(() => {});
    const socket = getSocket();
    const onPresence = (p) => setPresence(p);
    socket.on('support:presence', onPresence);
    const tick = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => { dead = true; socket.off('support:presence', onPresence); clearInterval(tick); };
  }, []);

  function presenceLabel() {
    if (presence.online) return t('supOnline');
    if (!presence.lastSeenAt) return t('supUsuallyFast');
    const minutes = Math.max(0, Math.round((Date.now() - new Date(presence.lastSeenAt).getTime()) / 60000));
    if (minutes < 1) return t('supSeenJustNow');
    if (minutes < 60) return `${minutes} ${t('supSeenMinutes')}`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} ${t('supSeenHours')}`;
    return `${Math.round(hours / 24)} ${t('supSeenDays')}`;
  }

  // Ochilganda: kirish vaqti + server tarixi (salomlashuv tarixdan KEYIN, kirish vaqti bilan)
  useEffect(() => {
    if (!open) return undefined;
    setGreetAt(new Date());
    setLatched(false);
    let cancelled = false;
    api.getSupportChat()
      .then((data) => {
        if (cancelled) return;
        setMessages((data?.messages || []).map((m, i) => ({
          id: m._id || `h${i}`,
          from: m.from === 'admin' ? 'support' : 'user',
          text: m.text,
          adminName: m.adminName,
          edited: Boolean(m.editedAt),
          at: m.createdAt || m.at || Date.now(),
          history: true,
        })));
        setUnread(0);
      })
      .catch(() => { if (!cancelled) setMessages([]); }); // server yo'q — salomlashuv baribir ko'rinadi
    return () => { cancelled = true; };
  }, [open]);

  // Admin javoblari real vaqtda
  useEffect(() => {
    if (!userId) return undefined;
    const socket = getSocket();
    joinUserRoom(userId);
    const handler = (data) => {
      setMessages((m) => [...m, {
        id: data.id || Date.now(), from: 'support', text: data.text, adminName: data.adminName,
        at: data.at || Date.now(), fresh: true,
      }]);
      setUnread((n) => (open ? 0 : n + 1));
    };
    const onEdit = (data) => {
      if (!data?.id) return;
      setMessages((m) => m.map((msg) => (String(msg.id) === String(data.id) ? { ...msg, text: data.text, edited: true } : msg)));
    };
    const onDelete = (data) => {
      if (!data?.id) return;
      setMessages((m) => m.filter((msg) => String(msg.id) !== String(data.id)));
    };
    socket.on('support:reply', handler);
    socket.on('support:edit', onEdit);
    socket.on('support:delete', onDelete);
    return () => {
      socket.off('support:reply', handler);
      socket.off('support:edit', onEdit);
      socket.off('support:delete', onDelete);
    };
  }, [userId, open]);

  // Vaqt chizig'i: tarix → salomlashuv (kirish payti) → shu sessiyadagi xabarlar
  const timeline = useMemo(() => {
    if (!greetAt) return [];
    const greeting = { id: '__greeting__', from: 'support', text: t('chatWelcome'), at: greetAt, greeting: true };
    return [...messages.filter((m) => m.history), greeting, ...messages.filter((m) => !m.history)];
  }, [messages, greetAt, t]);

  const scrollDown = useCallback(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);
  useEffect(() => { requestAnimationFrame(scrollDown); }, [timeline.length, scrollDown]);

  /*
   * Yozishmalar sig'may qolsa — ixcham rejim (qaytib-qaytib miltillamasligi uchun yopilguncha saqlanadi).
   * Faqat HAQIQIY yozishma bo'lsa (tarix yoki shu sessiya xabarlari): bitta salomlashuvda maket o'zgarishsiz turadi.
   */
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (open && el && !latched && messages.length > 0 && el.scrollHeight > el.clientHeight + 6) setLatched(true);
  });

  // iOS/Android klaviatura: varaq ko'rinadigan oyna balandligiga moslashadi (kiritish maydoni klaviatura ostida qolmaydi)
  useEffect(() => {
    if (!open || !window.visualViewport) return undefined;
    const vv = window.visualViewport;
    const apply = () => document.documentElement.style.setProperty('--sc-vh', `${Math.round(vv.height)}px`);
    apply();
    vv.addEventListener('resize', apply);
    return () => { vv.removeEventListener('resize', apply); document.documentElement.style.removeProperty('--sc-vh'); };
  }, [open]);

  const sendText = async (text, retryId) => {
    if (!text || sending) return;
    const tempId = retryId || `t${Date.now()}`;
    if (retryId) setMessages((m) => m.map((x) => (x.id === retryId ? { ...x, failed: false, at: Date.now() } : x)));
    else setMessages((m) => [...m, { id: tempId, from: 'user', text, at: Date.now() }]);
    setSending(true);
    try {
      await api.sendSupportMessage(text);
    } catch {
      setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, failed: true } : x)));
    } finally {
      setSending(false);
    }
  };
  const send = (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendText(text);
    inputRef.current?.focus();
  };

  const compact = focused || latched;
  // Kun ajratgichi faqat yozishma bir necha kunni qamrasa (bitta kun uchun "Bugun" — ortiqcha shovqin)
  const multiDay = new Set(timeline.map((m) => dayKey(m.at))).size > 1;
  let lastDay = '';

  return (
    <>
      {!open && !hideFab && (
        <button className="support-fab" onClick={() => setOpen(true)} aria-label={t('chatTitle')}>
          <span className="support-fab__ring" />
          <span className="support-fab__ring support-fab__ring--2" />
          <span className="support-fab__icon"><OperatorAvatar size={44} /></span>
          {unread > 0 && <span className="support-fab__badge">{unread}</span>}
        </button>
      )}

      {open && (
        <>
          <div className={`support-overlay${closing ? ' is-closing' : ''}`} onClick={close} />
          <div className={`sc${compact ? ' sc--compact' : ''}${closing ? ' is-closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="sc-title" lang={lang === 'ru' ? 'ru' : 'uz'}>
            {/* Qahramon: krem fon + operator (varaq chetidan chiqib turadi) */}
            <div className="sc-hero" aria-hidden="true">
              <img className="sc-back" src="/support/backdrop.svg" alt="" draggable="false" />
              <picture>
                <source srcSet="/support/operator.webp" type="image/webp" />
                <img className="sc-girl" src="/support/operator.png" alt="" draggable="false" />
              </picture>
            </div>
            <button type="button" className="sc-x" onClick={close} aria-label={t('close')}>
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>
            </button>

            <div className="sc-card">
              <svg className="sc-wave" viewBox="0 0 390 48" preserveAspectRatio="none" aria-hidden="true">
                <path d="M0 22 C 28 10, 58 3, 86 3 C 148 4, 206 15, 262 27 C 312 38, 352 43, 390 39 L 390 48 L 0 48 Z" />
              </svg>

              {/* Ixcham sarlavha (klaviatura/uzun yozishma) */}
              <div className="sc-mini">
                <span className="sc-mini__ava"><OperatorAvatar size={38} /></span>
                <div className="sc-mini__txt">
                  <div className="sc-mini__title">Lokma Go <span>{t('chatTitle')}</span></div>
                  <div className={`sc-mini__sub${presence.online ? ' is-online' : ''}`}>{presenceLabel()}</div>
                </div>
              </div>

              <h2 className="sc-title" id="sc-title">
                <span className="sc-title__brand">Lokma Go</span>
                <span className="sc-title__accent">{t('supTitleAccent')}</span>
              </h2>

              <div className="sc-body" ref={bodyRef} aria-live="polite">
                {timeline.map((m) => {
                  const dk = dayKey(m.at);
                  const sep = multiDay && dk !== lastDay ? <div key={`d${dk}`} className="sc-day"><span>{dayLabel(m.at, t)}</span></div> : null;
                  lastDay = dk;
                  return [
                    sep,
                    <div key={m.id} className={`sc-row sc-row--${m.from === 'user' ? 'user' : 'support'}`}>
                      <Bubble msg={m} typing={Boolean(m.greeting || m.fresh)} fast={Boolean(m.fresh)} onTyped={scrollDown} t={t} />
                      {m.failed && (
                        <button type="button" className="sc-retry" onMouseDown={keepFocus} onClick={() => sendText(m.text, m.id)}>
                          {t('supFailed')} · <b>{t('supRetry')}</b>
                        </button>
                      )}
                    </div>,
                  ];
                })}
              </div>

              <p className="sc-happy">
                <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.6-9.3C.9 8.3 2.9 4.5 6.6 4.1c2.1-.2 3.7.9 5.4 2.9 1.7-2 3.3-3.1 5.4-2.9 3.7.4 5.7 4.2 4.2 7.6C19.5 16.4 12 21 12 21z" fill="#FA6509" /></svg>
                {t('supHappy')}
              </p>

              <form className="sc-pill" onSubmit={send}>
                <svg className="sc-spark" viewBox="0 0 40 34" aria-hidden="true"><path d="M8 18 L4 6 M20 14 L30 4 M24 26 L36 24" /></svg>
                <span className="sc-pill__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 3.5c-4.97 0-9 3.47-9 7.75 0 2.2 1.07 4.18 2.8 5.6L5 20.5l4.13-1.8c.9.22 1.86.33 2.87.33 4.97 0 9-3.47 9-7.78S16.97 3.5 12 3.5z" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="8.3" cy="11.3" r="1.15" fill="#fff" /><circle cx="12" cy="11.3" r="1.15" fill="#fff" /><circle cx="15.7" cy="11.3" r="1.15" fill="#fff" /></svg>
                </span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onFocus={() => { clearTimeout(blurTimer.current); setFocused(true); }}
                  onBlur={() => { blurTimer.current = setTimeout(() => setFocused(false), 220); }}
                  placeholder={t('chatPlaceholder')}
                  aria-label={t('chatPlaceholder')}
                  enterKeyHint="send"
                  maxLength={2000}
                />
                <button type="submit" className="sc-send" aria-label={t('send')} disabled={!input.trim() || sending} onMouseDown={keepFocus}>
                  <Icon name="send" size={19} color="#F7741F" />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}
