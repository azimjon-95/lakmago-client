import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';

function Stub({ icon, title, text }) {
  return (
    <div className="min-h-screen bg-surface max-w-[420px] mx-auto flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <Icon name={icon} size={48} color="#9A9A94" />
        <div className="text-lg font-medium text-ink mt-4">{title}</div>
        <p className="text-sm text-muted mt-1.5">{text}</p>
      </div>
      <BottomNav />
    </div>);

}

export const SearchPage = () =>
<Stub icon="search" title="Qidirish" text="Taom yoki restoran nomini kiriting." />;


export const FavoritesPage = () =>
<Stub icon="heart" title="Sevimli" text="Sevimli restoranlaringiz shu yerda saqlanadi." />;
