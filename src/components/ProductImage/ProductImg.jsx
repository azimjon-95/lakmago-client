import { useState } from 'react';
import { NoImage } from './NoImage';

/* Mahsulot rasmi: yuklanmasa (xato) yoki manzil bo'sh bo'lsa — "Rasm yo'q" belgisi (bo'sh joy qolmaydi). */
/* priority — ekranga birinchi tushadigan rasm: kutmasdan va yuqori ustuvorlik bilan yuklanadi (sekin internetda muhim). */
export function ProductImg({ src, alt = '', fit = 'contain', compact = true, priority = false }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <NoImage compact={compact} />;
  return (
    <img
      src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" draggable="false"
      fetchpriority={priority ? 'high' : undefined}
      onError={() => setFailed(true)}
      style={{ width: '100%', height: '100%', objectFit: fit }}
    />
  );
}
