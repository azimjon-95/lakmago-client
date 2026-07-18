// Kategoriya illyustratsiyalari — bir xil uslubda chizilgan SVG.
// Tashqi rasm emas: darhol ko'rinadi, yuklanish kutilmaydi, hech qachon "sinmaydi".

const ART = {
  // Barchasi — assorti tovoq
  all: (
    <>
      <ellipse cx="32" cy="40" rx="24" ry="15" fill="#E8B457" />
      <ellipse cx="32" cy="37" rx="21" ry="12" fill="#F3CC7E" />
      <circle cx="24" cy="34" r="4" fill="#D9542F" />
      <circle cx="38" cy="36" r="4" fill="#D9542F" />
      <circle cx="31" cy="31" r="3.5" fill="#7FA84B" />
      <path d="M8 40c0-2 2-3 4-3M56 40c0-2-2-3-4-3" stroke="#C08A2E" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Milliy — osh (palov)
  milliy: (
    <>
      <ellipse cx="32" cy="42" rx="25" ry="14" fill="#2F5C9E" />
      <ellipse cx="32" cy="39" rx="22" ry="12" fill="#4A7BC4" />
      <ellipse cx="32" cy="37" rx="19" ry="10" fill="#E8B457" />
      <ellipse cx="30" cy="35" rx="14" ry="7" fill="#F3CC7E" />
      <circle cx="26" cy="33" r="3.5" fill="#8B4A28" />
      <circle cx="37" cy="35" r="3.5" fill="#8B4A28" />
      <rect x="28" y="29" width="10" height="3" rx="1.5" fill="#D9542F" />
      <path d="M22 31c2-1 5-1 7 0" stroke="#7FA84B" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Choyxona — choynak va piyola
  choyxona: (
    <>
      <path d="M18 28h20a4 4 0 0 1 4 4v8a8 8 0 0 1-8 8H22a8 8 0 0 1-8-8v-8a4 4 0 0 1 4-4z" fill="#4A7BC4" />
      <path d="M42 33c4 0 6 2 6 5s-2 5-6 5" stroke="#4A7BC4" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M26 28l2-6h6l2 6" fill="#3A63A8" />
      <ellipse cx="28" cy="22" rx="5" ry="2" fill="#7FA0D8" />
      <path d="M20 36h16" stroke="#7FA0D8" strokeWidth="2" strokeLinecap="round" />
      <path d="M46 46h10a3 3 0 0 1-3 4h-4a3 3 0 0 1-3-4z" fill="#E8E2D5" />
    </>
  ),
  // Fast food — burger
  fastfood: (
    <>
      <path d="M12 26c0-8 9-12 20-12s20 4 20 12H12z" fill="#E8A94E" />
      <circle cx="24" cy="20" r="1.5" fill="#FFF3D6" />
      <circle cx="34" cy="18" r="1.5" fill="#FFF3D6" />
      <circle cx="42" cy="21" r="1.5" fill="#FFF3D6" />
      <rect x="11" y="26" width="42" height="5" rx="2.5" fill="#7FA84B" />
      <rect x="11" y="30" width="42" height="6" rx="2" fill="#8B4A28" />
      <rect x="11" y="35" width="42" height="4" rx="2" fill="#F0C24E" />
      <path d="M12 39h40c0 6-9 9-20 9s-20-3-20-9z" fill="#E8A94E" />
    </>
  ),
  // Sushi — rol
  sushi: (
    <>
      <circle cx="32" cy="36" r="18" fill="#F5EFE0" />
      <circle cx="32" cy="36" r="18" fill="none" stroke="#2A2A2A" strokeWidth="4" />
      <circle cx="32" cy="36" r="8" fill="#E8734A" />
      <circle cx="32" cy="36" r="4" fill="#7FA84B" />
      <ellipse cx="32" cy="20" rx="16" ry="5" fill="#F08A5D" />
      <path d="M20 20c4-2 20-2 24 0" stroke="#D9542F" strokeWidth="1.5" fill="none" />
    </>
  ),
  // Shirinlik — tort bo'lagi
  shirinlik: (
    <>
      <path d="M14 44V30l18-8 18 8v14z" fill="#F5E2C8" />
      <path d="M14 34l18-6 18 6v4l-18-6-18 6z" fill="#C97B4A" />
      <path d="M14 42l18-6 18 6v2H14z" fill="#C97B4A" />
      <path d="M32 22l18 8-18 6-18-6z" fill="#FBEEDC" />
      <circle cx="32" cy="18" r="4" fill="#D9542F" />
      <path d="M32 14c0-2 1-3 2-4" stroke="#7FA84B" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  // Lavash / shaurma
  lavash: (
    <>
      <path d="M20 46l6-30c1-4 4-6 8-6s7 2 8 6l6 30z" fill="#F0DFC0" />
      <path d="M24 40l4-22c.6-2.4 2.4-3.6 4-3.6s3.4 1.2 4 3.6l4 22z" fill="#E8CFA0" />
      <circle cx="30" cy="26" r="2.5" fill="#D9542F" />
      <circle cx="35" cy="32" r="2.5" fill="#7FA84B" />
      <circle cx="31" cy="36" r="2" fill="#8B4A28" />
      <path d="M20 46h24l-2 6H22z" fill="#E8E2D5" />
    </>
  ),
  // Pitsa
  pitsa: (
    <>
      <path d="M32 12l22 34a44 44 0 0 1-44 0z" fill="#F0C24E" />
      <path d="M32 18l17 26a37 37 0 0 1-34 0z" fill="#E8A94E" />
      <circle cx="26" cy="34" r="3.5" fill="#D9542F" />
      <circle cx="38" cy="32" r="3.5" fill="#D9542F" />
      <circle cx="32" cy="41" r="3.5" fill="#D9542F" />
      <circle cx="30" cy="26" r="2" fill="#7FA84B" />
    </>
  ),
  // Shashlik
  shashlik: (
    <>
      <path d="M12 50L52 14" stroke="#B8B8B8" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="20" y="34" width="11" height="11" rx="3" transform="rotate(-42 20 34)" fill="#8B4A28" />
      <rect x="28" y="26" width="11" height="11" rx="3" transform="rotate(-42 28 26)" fill="#A0552E" />
      <rect x="36" y="18" width="11" height="11" rx="3" transform="rotate(-42 36 18)" fill="#8B4A28" />
      <circle cx="26" cy="35" r="2" fill="#D9542F" />
      <circle cx="42" cy="19" r="2" fill="#D9542F" />
    </>
  ),
  // Magazin (do'kon)
  magazin: (
    <>
      <path d="M12 24h40l-3-9H15z" fill="#E85D3D" />
      <rect x="12" y="24" width="40" height="26" rx="3" fill="#F0DFC0" />
      <rect x="18" y="32" width="12" height="18" rx="2" fill="#C97B4A" />
      <rect x="34" y="32" width="12" height="10" rx="2" fill="#7FA0D8" />
      <circle cx="28" cy="41" r="1.5" fill="#F0DFC0" />
    </>
  ),
  // Ichimlik / qahva
  ichimlik: (
    <>
      <path d="M20 22h22l-3 26a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" fill="#F5EFE0" />
      <path d="M21 30h20l-2 18a3 3 0 0 1-3 3h-10a3 3 0 0 1-3-3z" fill="#8B5A2B" />
      <ellipse cx="31" cy="30" rx="10" ry="2.5" fill="#C99A5B" />
      <path d="M42 28c4 0 6 2 6 5s-2 5-6 5" stroke="#F5EFE0" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M27 18c0-2 1-3 1-5M33 18c0-2 1-3 1-5" stroke="#A99C8C" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
};

export function CategoryIcon({ name, size = 56 }) {
  const art = ART[name] || ART.all;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden="true">
      {art}
    </svg>
  );
}
