/*
 * ═══ iOS (WebKit) "oq qolgan sahifa" tuzatishi ═══
 *
 * Alomat (Telegram/iPhone): orqaga qaytilganda slayderlar, kartalar, rasmlar CHIZILMAY qoladi (oq joy); skroll qilsa yoki
 * ekranga tegsa — paydo bo'ladi. Ma'lumot kelgan: DOM to'liq, faqat WebKit gorizontal skroll/transform qatlamlarini
 * (overflow-x + scroll-snap, will-change) sahifa almashgandan keyin qayta rasterlamaydi.
 *
 * Tuzatish: sahifa almashgach (va ilova qaytganda) qisqa vaqt ichida — mijoz skroll qilgandagi kabi — qatlamlarni majburan
 * yangilaymiz: (1) hujjatni 1 px siljitib qaytaramiz, (2) gorizontal skroll konteynerlari va animatsion qatlamlarga
 * will-change vaqtincha beriladi (qatlam qayta quriladi). Ko'zga ko'rinmaydi, faqat iOS'da, Android/web o'zgarmaydi.
 */
export const KICK_DELAYS = [0, 120, 450, 1200];   // ms: sahifa almashgandan keyin (lazy sahifa/rasmlar kech kelsa ham)

const SCROLLER_SEL = '[class*="track"], [class*="scroll"], [class*="slider"], [class*="carousel"], [class*="rail"], .no-scrollbar';

/** Bitta "turtki": 1 px skroll + gorizontal qatlamlarni yangilash. env — sinov uchun almashtiriladi. */
export function kickRepaint(env = defaultEnv()) {
  const { win, doc, raf } = env;
  if (!win || !doc) return;
  try {
    const root = doc.documentElement;
    const y = win.scrollY || root.scrollTop || 0;
    const scrollable = root.scrollHeight - win.innerHeight > 4;

    // (2) gorizontal skrollerlar: qatlamni qayta qurish (scrollLeft'ga tegilmaydi — snap holati buzilmasin)
    const touched = [];
    doc.querySelectorAll(SCROLLER_SEL).forEach((el) => {
      if (el.scrollWidth <= el.clientWidth + 1) return;
      const ox = win.getComputedStyle(el).overflowX;
      if (ox !== 'auto' && ox !== 'scroll') return;
      el.style.willChange = 'transform';
      touched.push(el);
    });

    // (1) 1 px siljitish va qaytarish (ikki kadr — WebKit tile'larni qayta tekshiradi)
    if (scrollable) win.scrollTo(0, y + 1);
    raf(() => {
      if (scrollable) win.scrollTo(0, y);
      raf(() => { touched.forEach((el) => { el.style.willChange = ''; }); });
    });
  } catch { /* chizish tuzatishi hech qachon xato bermasin */ }
}

function defaultEnv() {
  if (typeof window === 'undefined') return {};
  return { win: window, doc: document, raf: (fn) => window.requestAnimationFrame(fn) };
}

let timers = [];
/** Sahifa almashgandan keyin bir necha marta turtki beradi (oldingi navbat bekor qilinadi). */
export function scheduleRepaintKick(delays = KICK_DELAYS, env) {
  timers.forEach((t) => clearTimeout(t));
  timers = delays.map((ms) => setTimeout(() => kickRepaint(env), ms));
}

let installed = false;
/** Ilova qaytganda / bfcache'dan tiklanganda / aylantirilganda ham turtki. */
export function installRepaintKick() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const go = () => scheduleRepaintKick();
  window.addEventListener('pageshow', go);
  window.addEventListener('focus', go);
  window.addEventListener('orientationchange', go);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) go(); });
}
