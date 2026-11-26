import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { SupportChat } from '@/components/SupportChat/SupportChat';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/telegram';
import { localized } from '@/lib/localizedContent';
import { HELP_RAW, HELP_UI_RAW } from '@/data/helpContent';
import './Help.css';

/*
 * «Ko'p beriladigan savollar» — Lokma Go (to'q sariq) va Lokma Market (yashil) uchun alohida.
 * Bo'lim almashganda rang ham yumshoq almashadi. Javob panellari grid 0fr→1fr bilan ochiladi (balandlik hisoblanmaydi,
 * shuning uchun sakramaydi). Bir vaqtda bitta savol ochiq. prefers-reduced-motion hurmat qilinadi.
 */
export function HelpPage() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const ui = localized({ uz: HELP_UI_RAW.uz, ru: HELP_UI_RAW.ru }, lang, 'helpui');
  const faq = useMemo(() => localized(HELP_RAW, lang, 'help'), [lang]);
  const [tab, setTab] = useState(() => {
    try { return document.documentElement.dataset.section === 'market' ? 'market' : 'go'; } catch { return 'go'; }
  });
  const [open, setOpen] = useState(null);
  const listRef = useRef(null);

  useEffect(() => { setOpen(null); }, [tab, lang]);

  const pick = (k) => { if (k === tab) return; haptic(); setTab(k); };
  const toggle = (i) => { haptic(); setOpen((o) => (o === i ? null : i)); };
  const items = faq[tab];

  return (
    <div className={`app-shell help help--${tab}`}>
      <header className="page-header">
        <button onClick={() => navigate(-1)} aria-label={ui.back}><Icon name="arrowLeft" size={22} color="var(--ink)" /></button>
        <h1>{ui.title}</h1>
      </header>

      <div className="help__hero">
        <div className="help__orb" aria-hidden="true"><Icon name="messageCircle" size={22} color="var(--brand-text)" /></div>
        <div className="help__hero-text">
          <div className="help__hello">{ui.hello}</div>
          <div className="help__sub">{ui.sub}</div>
        </div>
      </div>

      <div className="help__seg" role="tablist" data-tab={tab}>
        <span className="help__seg-pill" aria-hidden="true" />
        <button role="tab" aria-selected={tab === 'go'} className={tab === 'go' ? 'is-on' : ''} onClick={() => pick('go')}>{ui.tabGo}</button>
        <button role="tab" aria-selected={tab === 'market'} className={tab === 'market' ? 'is-on' : ''} onClick={() => pick('market')}>{ui.tabMarket}</button>
      </div>

      <ul className="help__list" ref={listRef} key={`${tab}-${lang}`}>
        {items.map((it, i) => {
          const isOpen = open === i;
          return (
            <li key={i} className={`help-item ${isOpen ? 'is-open' : ''}`} style={{ '--i': i }}>
              <button type="button" className="help-item__q" aria-expanded={isOpen} aria-controls={`hp-${tab}-${i}`} onClick={() => toggle(i)}>
                <span>{it.q}</span>
                <span className="help-item__chev" aria-hidden="true"><Icon name="chevronDown" size={18} color="currentColor" /></span>
              </button>
              <div className="help-item__panel" id={`hp-${tab}-${i}`} role="region" aria-hidden={!isOpen}>
                <div className="help-item__inner">
                  <p className="help-item__a">{it.a}</p>
                  {it.tip && (
                    <div className="help-item__tip">
                      <span className="help-item__tip-ic" aria-hidden="true"><Icon name="sparkles" size={14} color="var(--brand)" /></span>
                      <span><b>{ui.tipLabel}:</b> {it.tip}</span>
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <section className="help__contact">
        <div className="help__contact-title">{ui.contactTitle}</div>
        <p>{ui.contactText}</p>
        <button type="button" className="btn-primary help__contact-btn" onClick={() => { haptic(); window.dispatchEvent(new Event('lokma:open-support')); }}>
          {ui.contactBtn}
        </button>
        <button type="button" className="help__link" onClick={() => navigate('/privacy')}>
          <Icon name="shieldCheck" size={15} color="currentColor" /> {ui.privacy}
        </button>
      </section>

      <SupportChat hideFab />
    </div>
  );
}
