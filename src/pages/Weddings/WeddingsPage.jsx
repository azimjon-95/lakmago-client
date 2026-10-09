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
/* To'yxonalar fonlari: hero rasmining to'q tusi va sahifaning iliq fil suyagi rangi */
const WEDDING_SURFACE = { dark: '#1E1A16', light: '#FBF7F2' };

export function WeddingsPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { t } = useI18n();
  const authStatus = useUser((s) => s.authStatus);
  const { data: features, isLoading } = useFeatures(authStatus);
  const setVisible = useWeddingFrame((s) => s.setVisible);
  const setPath = useWeddingFrame((s) => s.setPath);
  const tone = useWeddingFrame((s) => s.tone);
  const allowed = Boolean(features?.wedding);

  useEffect(() => {
    // Chuqur havola: faqat xavfsiz slug
    setPath(slug && /^[a-z0-9-]{1,80}$/i.test(slug) ? `/venue/${slug}` : '/');
  }, [slug, setPath]);

  useEffect(() => {
    if (!allowed) return undefined;
    setVisible(true);
    return () => {
      setVisible(false);
      setPath('/');
      applySectionTheme(useSection.getState().section);
    };
  }, [allowed, setVisible, setPath]);

  /*
   * Telegram tepa qismi (status bar, "Назад" / "⌄ ⋯") sayt fonidan rang oladi:
   * rasm ustida to'q -> oq belgilar; och fonga aylantirilganda -> qora belgilar.
   * Chiqishda yuqoridagi effekt bo'lim rangini qaytaradi.
   */
  useEffect(() => {
    if (!allowed) return;
    setTelegramSurfaceColor(WEDDING_SURFACE[tone] ?? WEDDING_SURFACE.dark);
  }, [allowed, tone]);

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
