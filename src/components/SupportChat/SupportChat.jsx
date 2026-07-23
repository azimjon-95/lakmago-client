import { useState, useRef, useEffect } from 'react';
import { useT } from '@/i18n';
import './SupportChat.css';
import { OperatorAvatar } from './OperatorAvatar';
import { Icon } from '@/components/Icon';
import { api } from '@/api';
import { io } from 'socket.io-client';
import { useUser } from '@/store/user';

// Bottom-right animatsiyali chat tugmasi + oyna.
// Mijoz sayt adminlari (yordam xizmati) bilan gaplashadi.
export function SupportChat() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const bodyRef = useRef(null);

  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const userId = useUser((st) => st.user?._id || st.user?.id);

  // Chat ochilganda serverdan tarixni yuklaymiz
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.getSupportChat()
      .then((data) => {
        if (cancelled) return;
        const list = (data?.messages || []).map((m, i) => ({
          id: m._id || i,
          from: m.from === 'admin' ? 'support' : 'user',
          text: m.text,
          adminName: m.adminName,
        }));
        // Tarix bo'sh bo'lsa — xush kelibsiz
        setMessages(list.length ? list : [{ id: 'w', from: 'support', text: t('chatWelcome') }]);
        setUnread(0);
      })
      .catch(() => {
        // Server yo'q — kamida xush kelibsiz ko'rsatamiz
        setMessages([{ id: 'w', from: 'support', text: t('chatWelcome') }]);
      });
    return () => { cancelled = true; };
  }, [open, t]);

  // Admin javobini real vaqtda qabul qilamiz
  useEffect(() => {
    if (!userId) return;
    const socket = io(import.meta.env.VITE_SOCKET_URL ?? '/', {
      transports: ['websocket', 'polling'],
    });
    socket.emit('join:user', String(userId));
    socket.on('support:reply', (data) => {
      setMessages((m) => [...m, {
        id: Date.now(), from: 'support', text: data.text, adminName: data.adminName,
      }]);
      // Chat yopiq bo'lsa — o'qilmagan belgisi
      setUnread((n) => (open ? 0 : n + 1));
    });
    return () => socket.disconnect();
  }, [userId, open]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;

    // Darhol ko'rsatamiz (tez his qilinsin)
    const tempId = Date.now();
    setMessages((m) => [...m, { id: tempId, from: 'user', text }]);
    setInput('');
    setSending(true);

    try {
      await api.sendSupportMessage(text);
    } catch {
      // Yuborilmadi — belgilab qo'yamiz
      setMessages((m) => m.map((msg) =>
        msg.id === tempId ? { ...msg, failed: true } : msg));
    } finally {
      setSending(false);
    }
  };;

  return (
    <>
      {!open && (
        <button className="support-fab" onClick={() => setOpen(true)} aria-label={t('chatTitle')}>
          <span className="support-fab__ring" />
          <span className="support-fab__ring support-fab__ring--2" />
          <span className="support-fab__icon"><OperatorAvatar size={44} /></span>
        </button>
      )}

      {open && (
        <div className="support-chat">
          <div className="support-chat__header">
            <div className="support-chat__header-info">
              <span className="support-chat__avatar"><OperatorAvatar size={36} /></span>
              <div>
                <div className="support-chat__title">{t('chatTitle')}</div>
                <div className="support-chat__online">● online</div>
              </div>
            </div>
            <button className="support-chat__close" onClick={() => setOpen(false)} aria-label={t('close')}><Icon name="x" size={18} color="#A99C8C" /></button>
          </div>

          <div className="support-chat__body" ref={bodyRef}>
            {messages.map((m) => (
              <div key={m.id} className={`support-msg support-msg--${m.from}`}>
                {m.text}
              </div>
            ))}
          </div>

          <div className="support-chat__input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={t('chatPlaceholder')}
            />
            <button onClick={send} aria-label={t('send')} className="support-chat__send">
              <Icon name="telegram" size={20} color="#2A1500" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
