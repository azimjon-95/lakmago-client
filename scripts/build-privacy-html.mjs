/*
 * public/privacy.html (https://lokma.uz/privacy.html — App Store / Google Play uchun ochiq havola) ni
 * ilova ichidagi maxfiylik siyosati bilan BIR MANBADAN yig'adi: src/data/privacyContent.js + src/config/legal.js.
 *   node scripts/build-privacy-html.mjs
 */
import { writeFileSync } from 'node:fs';
import { PRIVACY_RAW } from '../src/data/privacyContent.js';
import { LEGAL } from '../src/config/legal.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const MON = { uz: ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'], ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'] };
const date = (iso, l) => { const [y, m, d] = iso.split('-').map(Number); return l === 'ru' ? `${d} ${MON.ru[m - 1]} ${y} г.` : `${y}-yil ${d}-${MON.uz[m - 1]}`; };

function part(lang) {
  const c = PRIVACY_RAW[lang];
  const u = c.ui;
  const det = [
    `<li><strong>${esc(u.operator)}:</strong> «${esc(LEGAL.company)}» ${esc(LEGAL.form)}</li>`,
    LEGAL.stir && `<li><strong>${esc(u.stir)}:</strong> ${esc(LEGAL.stir)}</li>`,
    LEGAL.address && `<li><strong>${esc(u.address)}:</strong> ${esc(LEGAL.address)}</li>`,
    LEGAL.email && `<li><strong>${esc(u.email)}:</strong> ${esc(LEGAL.email)}</li>`,
    `<li><strong>${esc(u.site)}:</strong> ${esc(LEGAL.site)}</li>`,
  ].filter(Boolean).join('\n      ');
  const secs = c.sections.map((s) => `
    <h2 id="${lang}-${s.id}">${esc(s.title)}</h2>
${s.blocks.map((b) => (b.ul ? `    <ul>\n${b.ul.map((li) => `      <li>${li}</li>`).join('\n')}\n    </ul>` : `    <p>${esc(b.p)}</p>`)).join('\n')}`).join('\n');
  return `
    <h1>${esc(u.title)}</h1>
    <p class="date">${esc(u.effective)}: ${date(LEGAL.effective, lang)} · ${esc(u.version)} ${esc(LEGAL.version)}</p>
    <p>${esc(u.subtitle)}</p>${secs}
    <h2>${esc(u.legalTitle)}</h2>
    <ul>
      ${det}
    </ul>
    <p>${esc(u.lastLine)}</p>`;
}

const html = `<!doctype html>
<html lang="uz">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#fff8f1">
  <meta name="description" content="Lokma Go maxfiylik siyosati — shaxsiy ma‘lumotlardan foydalanish va ularni himoya qilish haqida.">
  <title>Maxfiylik siyosati — Lokma Go</title>
  <!-- AVTOMATIK YIG'ILADI: node scripts/build-privacy-html.mjs (qo'lda tahrirlamang — src/data/privacyContent.js ni o'zgartiring) -->
  <style>
    :root{color-scheme:light;--ink:#242321;--muted:#68645f;--orange:#ff6b12;--line:#eee4dc;--paper:#fff;--bg:#fff8f1}
    *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    header{padding:28px 20px;background:var(--paper);border-bottom:1px solid var(--line)}.top{max-width:850px;margin:auto;display:flex;align-items:center;gap:12px;color:var(--orange);font-weight:750;font-size:20px}
    main{max-width:850px;margin:36px auto;padding:0 20px 64px}.card{background:var(--paper);border:1px solid var(--line);border-radius:24px;padding:clamp(24px,5vw,48px);box-shadow:0 12px 40px #572d1110}
    h1{font-size:clamp(30px,6vw,42px);line-height:1.15;margin:0 0 10px;letter-spacing:-.04em}h2{margin:36px 0 8px;font-size:22px;line-height:1.3}p{margin:12px 0}ul{padding-left:24px}li{padding-left:4px;margin:8px 0}.date{color:var(--muted);margin:0 0 28px}.lang{display:inline-block;margin:40px 0 0;padding:7px 12px;border-radius:999px;background:#fff0e5;color:#b84800;font-size:13px;font-weight:700;letter-spacing:.08em}a{color:#b84800}footer{max-width:850px;margin:0 auto;padding:0 20px 36px;color:var(--muted);font-size:14px}
    @media(max-width:540px){main{margin:20px auto}.card{border-radius:18px;padding:22px 19px}h2{font-size:20px}}
  </style>
</head>
<body>
  <header><div class="top"><span aria-hidden="true">●</span><span>Lokma Go</span></div></header>
  <main><article class="card">${part('uz')}
    <div class="lang">РУССКИЙ</div>${part('ru')}
  </article></main>
  <footer>© ${LEGAL.effective.slice(0, 4)} «${esc(LEGAL.company)}» ${esc(LEGAL.form)}</footer>
</body>
</html>
`;
writeFileSync(new URL('../public/privacy.html', import.meta.url), html);
console.log('public/privacy.html yig‘ildi', html.length, 'bayt');
