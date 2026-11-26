import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { SupportChat } from '@/components/SupportChat/SupportChat';
import { useI18n } from '@/i18n';
import { haptic } from '@/lib/telegram';
import { localized } from '@/lib/localizedContent';
import { PRIVACY_RAW } from '@/data/privacyContent';
import { LEGAL } from '@/config/legal';
import './Legal.css';

const MONTHS = {
  uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'],
  uzc: ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
};
export function formatDate(iso, lang) {
  const [y, m, d] = String(iso).split('-').map(Number);
  const mon = (MONTHS[lang] || MONTHS.uz)[m - 1];
  return lang === 'ru' ? `${d} ${mon} ${y} г.` : lang === 'uzc' ? `${y} йил ${d} ${mon}` : `${y}-yil ${d}-${mon}`;
}

const SUMMARY_ICONS = ['fileText', 'info', 'users', 'lock'];
const RIGHTS_ICONS = ['edit', 'trash', 'bell', 'messageCircle'];

/* Bo'lim ko'ringanda yumshoq paydo bo'ladi (bir marta). IO yo'q muhitda darhol ko'rinadi. */
function useReveal() {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen];
}
function Reveal({ as: Tag = 'section', className = '', children, ...rest }) {
  const [ref, seen] = useReveal();
  return <Tag ref={ref} className={`${className} lg-reveal ${seen ? 'is-in' : ''}`} {...rest}>{children}</Tag>;
}

export function PrivacyPage() {
  const navigate = useNavigate();
  const { lang } = useI18n();
  const c = useMemo(() => localized(PRIVACY_RAW, lang, 'privacy'), [lang]);
  const ui = c.ui;
  const [active, setActive] = useState(c.sections[0].id);
  const tocRef = useRef(null);

  // Mundarijada hozirgi bo'lim ajralib turadi
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver((entries) => {
      const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (vis) setActive(vis.target.id);
    }, { rootMargin: '-20% 0px -65% 0px' });
    c.sections.forEach((s) => { const el = document.getElementById(`pp-${s.id}`); if (el) io.observe(el); });
    return () => io.disconnect();
  }, [c]);

  useEffect(() => {
    const chip = tocRef.current?.querySelector('.lg-chip.is-on');
    chip?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [active]);

  const go = (id) => {
    haptic();
    setActive(id);
    document.getElementById(`pp-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const details = [
    [ui.operator, `«${LEGAL.company}» ${LEGAL.form}`],
    LEGAL.stir && [ui.stir, LEGAL.stir],
    LEGAL.address && [ui.address, LEGAL.address],
    LEGAL.email && [ui.email, LEGAL.email],
    [ui.site, LEGAL.site],
  ].filter(Boolean);

  return (
    <div className="app-shell legal">
      <header className="page-header">
        <button onClick={() => navigate(-1)} aria-label={ui.back}><Icon name="arrowLeft" size={22} color="var(--ink)" /></button>
        <h1>{ui.title}</h1>
      </header>

      <div className="lg-hero">
        <div className="lg-hero__glow" aria-hidden="true" />
        <div className="lg-shield" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path className="lg-shield__body" d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            <path className="lg-shield__tick" d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <h2 className="lg-hero__title">{ui.title}</h2>
        <p className="lg-hero__sub">{ui.subtitle}</p>
        <div className="lg-hero__meta">
          <span>{ui.effective}: <b>{formatDate(LEGAL.effective, lang)}</b></span>
          <span>{ui.version}: <b>{LEGAL.version}</b></span>
        </div>
      </div>

      <Reveal className="lg-block">
        <h3 className="lg-block__title">{ui.summaryTitle}</h3>
        <div className="lg-cards">
          {c.summary.map(([t, d], i) => (
            <div key={t} className="lg-card" style={{ '--i': i }}>
              <span className="lg-card__ic"><Icon name={SUMMARY_ICONS[i]} size={18} color="var(--brand)" /></span>
              <div className="lg-card__t">{t}</div>
              <div className="lg-card__d">{d}</div>
            </div>
          ))}
        </div>
      </Reveal>

      <nav className="lg-toc" aria-label={ui.contents} ref={tocRef}>
        {c.sections.map((s) => (
          <button key={s.id} type="button" className={`lg-chip ${active === s.id ? 'is-on' : ''}`} onClick={() => go(s.id)}>
            {s.title.replace(/^\d+\.\s*/, '')}
          </button>
        ))}
      </nav>

      <article className="lg-doc">
        {c.sections.map((s) => (
          <Reveal as="section" key={s.id} id={`pp-${s.id}`} className="lg-sec">
            <h3 className="lg-sec__title">{s.title}</h3>
            {s.blocks.map((b, i) => (b.ul
              ? <ul key={i} className="lg-sec__ul">{b.ul.map((li, k) => <li key={k} dangerouslySetInnerHTML={{ __html: li }} />)}</ul>
              : <p key={i} className="lg-sec__p">{b.p}</p>))}
            {s.id === 'rights' && (
              <div className="lg-cards lg-cards--rights">
                {c.rights.map(([t, d], i) => (
                  <div key={t} className="lg-card">
                    <span className="lg-card__ic"><Icon name={RIGHTS_ICONS[i]} size={18} color="var(--brand)" /></span>
                    <div className="lg-card__t">{t}</div>
                    <div className="lg-card__d">{d}</div>
                  </div>
                ))}
              </div>
            )}
          </Reveal>
        ))}
      </article>

      <Reveal className="lg-block lg-company">
        <h3 className="lg-block__title">{ui.legalTitle}</h3>
        <dl className="lg-dl">
          {details.map(([k, v]) => (<div key={k}><dt>{k}</dt><dd>{v}</dd></div>))}
        </dl>
        <p className="lg-note">{ui.lastLine}</p>
        <button type="button" className="btn-primary lg-contact" onClick={() => { haptic(); window.dispatchEvent(new Event('lokma:open-support')); }}>
          {ui.contactBtn}
        </button>
      </Reveal>

      <SupportChat hideFab />
    </div>
  );
}
