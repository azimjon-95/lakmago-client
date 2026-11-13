import { Icon } from '@/components/Icon';
import './NoImage.css';

/*
 * "RASM YO'Q" — mahsulot rasmi bo'lmasa yoki Cloudinary'dan yuklanmasa (xato / internet uzilishi) shu belgi ko'rinadi.
 * Bo'sh joy emas: kulrang fon, rasm belgisi va "Rasm yo'q" matni (ekran o'quvchi uchun aria-label ham shu).
 * `compact` — kichik karta/slayder uchun (faqat ikonka + matn kichik).
 */
export function NoImage({ compact = false, label = "Rasm yo'q", className = '' }) {
  return (
    <div className={`noimg${compact ? ' noimg--compact' : ''} ${className}`.trim()} role="img" aria-label={label} data-testid="no-image">
      <Icon name="camera" size={compact ? 18 : 28} color="#9AA6A0" strokeWidth={1.8} />
      <span className="noimg__text">{label}</span>
    </div>
  );
}
