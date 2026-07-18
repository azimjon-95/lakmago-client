import { useState, useRef, useEffect } from 'react';
import { useT } from '@/i18n';
import './SupportChat.css';
import { OperatorAvatar } from './OperatorAvatar';
import { Icon } from '@/components/Icon';

// Bottom-right animatsiyali chat tugmasi + oyna.
// Mijoz sayt adminlari (yordam xizmati) bilan gaplashadi.
export function SupportChat() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const bodyRef = useRef(null);

  // Chat ochilganda xush kelibsiz xabari
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ id: 1, from: 'support', text: t('chatWelcome') }]);
    }
  }, [open, messages.length, t]);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    setMessages((m) => [...m, { id: Date.now(), from: 'user', text }]);
    setInput('');
    // Demo: admin javobini simulyatsiya qilamiz (haqiqiy tizimда Socket orqali)
    setTimeout(() => {
      setMessages((m) => [...m, {
        id: Date.now() + 1,
        from: 'support',
        text: '✓ Xabaringiz qabul qilindi. Operator tez orada javob beradi.',
      }]);
    }, 1200);
  };

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
            <button onClick={send} aria-label={t('send')}><Icon name="send" size={18} color="#F5A524" /></button>
          </div>
        </div>
      )}
    </>
  );
}
