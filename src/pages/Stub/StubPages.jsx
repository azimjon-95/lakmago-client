import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { useT } from '@/i18n';
import './Stub.css';

function Stub({ icon, title, text }) {
  return (
    <div className="app-shell stub">
      <div className="empty-state">
        <Icon name={icon} size={48} color="#A99C8C" />
        <div className="empty-state__title">{title}</div>
        <p className="empty-state__hint">{text}</p>
      </div>
      <BottomNav />
    </div>
  );
}

export function FavoritesPage() {
  const t = useT();
  return <Stub icon="heart" title={t('navProfile')} text={t('empty')} />;
}
