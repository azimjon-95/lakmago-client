/* Telegram startapp parametri → ilova sahifasi (src/lib/telegram.js getStartParam), Vite orqali. npm run test:startparam */
import { createServer } from 'vite';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
const server = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true, include: [] } });
let failed = 0;
const check = (name, cond) => { console.log((cond ? '  ✓ ' : '  ✗ FAIL: ') + name); if (!cond) failed += 1; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
try {
  const { getStartParam } = await server.ssrLoadModule('/src/lib/telegram.js');
  const ID = '6720a1b2c3d4e5f6a7b8c9d0';
  const at = (p) => { globalThis.window = { Telegram: { WebApp: { initDataUnsafe: { start_param: p } } }, location: { hash: '', search: '' } }; return getStartParam(); };

  check('rest_<id> → /restaurant/<id> (restoran guruhi tugmasi)', same(at(`rest_${ID}`), { type: 'section', to: `/restaurant/${ID}` }));
  check('katta harfli ID kichikka keltiriladi', same(at(`rest_${ID.toUpperCase()}`), { type: 'section', to: `/restaurant/${ID}` }));
  check('yaroqsiz parametrlar rad etiladi (xavfsizlik)', ['rest_', 'rest_123', `rest_${ID}x`, 'rest_../../admin', `rest_${ID}/menu`, `restaurant_${ID}`].every((p) => at(p) === null));
  check('mavjud: taom havolasi', same(at(`food_${ID}`), { type: 'dish', id: ID }));
  check('mavjud: bo\'lim va to\'yxona', same(at('weddings'), { type: 'section', to: '/weddings' }) && same(at('wedding_navruz-saroyi'), { type: 'section', to: '/weddings/venue/navruz-saroyi' }));
  check('umumiy LokmaGo tugmasi (startapp bo\'sh) — bosh sahifa', at('') === null);
  // URL orqali (Telegram SDK kechiksa): tgWebAppStartParam
  globalThis.window = { Telegram: { WebApp: { initDataUnsafe: {} } }, location: { hash: `#tgWebAppStartParam=rest_${ID}`, search: '' } };
  check('URL hash orqali ham ishlaydi', same(getStartParam(), { type: 'section', to: `/restaurant/${ID}` }));
} finally { await server.close(); }
if (failed) { console.log(`\n${failed} ta xato`); process.exit(1); }
console.log('\nHammasi o‘tdi');
