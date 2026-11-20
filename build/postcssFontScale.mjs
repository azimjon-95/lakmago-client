/*
 * Android WebView (Telegram Mini App, Capacitor) tizim "Shrift o'lchami" (textZoom) ni HAR BIR px shriftga ko'paytiradi
 * (Samsung Note/S Ultra, "Katta shrift" yoqilgan telefonlarda matn 20-40 % kattalashib, kartalar buziladi).
 * Chrome/Safari'da bunday emas. Bu plagin CSS'dagi har bir `font-size` ni `calc(<qiymat> / var(--tz, 1))` ga o'raydi:
 * --tz (lib/textScale.js o'lchaydi) 1 bo'lsa hech narsa o'zgarmaydi; 1,3 bo'lsa dizayndagi o'lcham qaytadi.
 * Faqat px / vw qiymatlar; em, %, inherit, var(...) tegilmaydi.
 */
export default function fontScale() {
  return {
    postcssPlugin: 'lokma-font-scale',
    Declaration(decl) {
      if (decl.prop !== 'font-size' || decl.__lokmaScaled) return;
      const v = decl.value.trim();
      if (/var\(|--tz|\bem\b|\d(em|rem|%)/.test(v)) return;
      if (!/\d(px|vw|vh)/.test(v)) return;
      decl.value = `calc(${v} / var(--tz, 1))`;
      decl.__lokmaScaled = true;
    },
  };
}
fontScale.postcss = true;
