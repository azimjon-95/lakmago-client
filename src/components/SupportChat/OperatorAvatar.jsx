/*
 * Yordam xizmati operatori avatari — brend rasmi (public/support/avatar.webp, 256×256, shaffof fon, doira).
 * Retina uchun yetarli (56 px tugma × 3 = 168 px). WebP bo'lmagan eski brauzerlar PNG oladi.
 * `online` — FAQAT haqiqiy holatda (operator onlayn bo'lsa) yashil nuqta ko'rsatiladi; avval u doim yonib turardi.
 */
export function OperatorAvatar({ size = 56, online = false }) {
  return (
    <span className="op-avatar" style={{ width: size, height: size }} aria-hidden="true">
      <picture>
        <source srcSet="/support/avatar.webp" type="image/webp" />
        <img src="/support/avatar.png" width={size} height={size} alt="" draggable="false" decoding="async" />
      </picture>
      {online && <i className="op-avatar__dot" />}
    </span>
  );
}
