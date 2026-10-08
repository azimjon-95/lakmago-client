import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '@/store/user';
import { useSection } from '@/store/section';
import { useWeddingFrame } from '@/store/weddingFrame';
import { useI18n } from '@/i18n';
import { useFeatures } from '@/hooks/queries';
import { setTelegramSurfaceColor, applySectionTheme } from '@/lib/telegram';
import '@/components/WeddingHost/WeddingHost.css';

/*
 * /weddings va /weddings/venue/:slug — to'yxonalar sahifasi.
 * Sayt o'zi doimiy iframe'da (components/WeddingHost) turadi; bu sahifa uni
 * faqat KO'RSATADI (va chuqur havola bo'lsa kerakli sahifani ochtiradi).
 */
export function WeddingsPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { t } = useI18n();
  const authStatus = useUser((s) => s.authStatus);
  const { data: features, isLoading } = useFeatures(authStatus);
  const setVisible = useWeddingFrame((s) => s.setVisible);
  const setPath = useWeddingFrame((s) => s.setPath);
  const allowed = Boolean(features?.wedding);

  useEffect(() => {
    // Chuqur havola: faqat xavfsiz slug
    setPath(slug && /^[a-z0-9-]{1,80}$/i.test(slug) ? `/venue/${slug}` : '/');
  }, [slug, setPath]);

  useEffect(() => {
    if (!allowed) return undefined;
    setVisible(true);
    // To'yxonalar oq fonda; chiqishda joriy bo'lim rangi qaytadi
    setTelegramSurfaceColor('#FFFFFF');
    return () => {
      setVisible(false);
      setPath('/');
      applySectionTheme(useSection.getState().section);
    };
  }, [allowed, setVisible, setPath]);

  if (!isLoading && !allowed) {
    return (
      <div className="weddings weddings--msg is-visible">
        <p>{t('marketUnavailable')}</p>
        <button type="button" onClick={() => navigate('/')}>{t('goHome')}</button>
      </div>
    );
  }
  return null;
}
