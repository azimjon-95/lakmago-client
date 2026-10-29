import { useT } from '@/i18n';
import './DemoBanner.css';

/** Demo hisob (App Store tekshiruvi) uchun ochiq tushuntirish: buyurtmalar haqiqiy emas. */
export function DemoBanner() {
  const t = useT();
  return (
    <div className="demo-banner" role="status" data-testid="demo-banner">
      <b>{t('demo_banner_title')}</b> · {t('demo_banner_text')}
    </div>
  );
}
