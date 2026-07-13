import { useState } from 'react';
import type { Dish, RestaurantCategory } from '@/types';
import { Icon } from '@/components/Icon';
import { BannerSlider } from '@/components/BannerSlider';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishScrollCard } from '@/components/DishScrollCard';
import { DishModal } from '@/components/DishModal';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { useUser } from '@/store/user';
import { useBanners } from '@/store/banners';
import { useNavigate } from 'react-router-dom';
import {
  restaurants,
  dishes,
  trendingDishIds,
  discountedDishIds,
} from '@/data/mock';

const categories: { id: RestaurantCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'Barchasi' },
  { id: 'milliy', label: 'Milliy' },
  { id: 'fastfood', label: 'Fast food' },
  { id: 'sushi', label: 'Sushi' },
  { id: 'shirinlik', label: 'Shirinlik' },
];

function SectionHeader({ icon, title }: { icon?: string; title: string }) {
  return (
    <div className="flex items-center justify-between px-4 pt-1.5 pb-2">
      <div className="text-base font-medium text-ink flex items-center gap-1.5">
        {icon && <Icon name={icon} size={17} color="#D85A30" />} {title}
      </div>
      <div className="text-[13px] text-brand-600">Barchasi</div>
    </div>
  );
}

export function HomePage() {
  const navigate = useNavigate();
  const user = useUser((s) => s.user);
  const banners = useBanners((s) => s.banners);
  const smallBanners = useBanners((s) => s.smallBanners);
  const [category, setCategory] = useState<RestaurantCategory | 'all'>('all');
  const [modalDish, setModalDish] = useState<Dish | null>(null);

  const filtered =
    category === 'all' ? restaurants : restaurants.filter((r) => r.category === category);
  const trending = dishes.filter((d) => trendingDishIds.includes(d.id));
  const discounted = dishes.filter((d) => discountedDishIds.includes(d.id));
  const defaultAddress = user.addresses.find((a) => a.id === user.defaultAddressId) ?? user.addresses[0];

  return (
    <div className="min-h-screen bg-surface flex flex-col max-w-[420px] mx-auto">
      {/* Sarlavha */}
      <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
        <button onClick={() => navigate('/profile')} className="text-left">
          <div className="text-[11px] text-muted flex items-center gap-1">
            <Icon name="pin" size={12} color="#EF9F27" /> Yetkazish
          </div>
          <div className="text-sm font-medium text-ink flex items-center gap-1">
            {defaultAddress ? `${defaultAddress.title}, ${defaultAddress.address}`.slice(0, 26) : 'Manzil tanlang'}{' '}
            <Icon name="chevronDown" size={13} color="#6B6B66" />
          </div>
        </button>
        <button
          onClick={() => navigate('/profile')}
          className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-brand-800 font-medium text-[13px]"
        >
          {user.photoInitials}
        </button>
      </div>

      {/* Qidiruv */}
      <div className="px-4 pt-1 pb-2.5">
        <button
          onClick={() => navigate('/search')}
          className="w-full flex items-center gap-2 bg-canvas border border-line rounded-xl px-3 py-2.5"
        >
          <Icon name="search" size={18} color="#9A9A94" />
          <span className="text-sm text-muted">Taom, restoran qidirish</span>
        </button>
      </div>

      {/* Banner */}
      <BannerSlider banners={banners} />

      {/* Kategoriyalar */}
      <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar">
        {categories.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="flex-none text-[13px] px-3.5 py-[7px] rounded-full font-medium transition-colors"
              style={
                active
                  ? { background: '#411E00', color: '#FAEEDA' }
                  : { background: '#F7F5F0', color: '#6B6B66', border: '0.5px solid #EAE7DF' }
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Trenddagi taomlar */}
      {trending.length > 0 && (
        <>
          <SectionHeader icon="flame" title="Trenddagi taomlar" />
          <div className="flex gap-2.5 px-4 pb-3 overflow-x-auto no-scrollbar">
            {trending.map((d) => (
              <DishScrollCard key={d.id} dish={d} onClick={setModalDish} />
            ))}
          </div>
        </>
      )}

      {/* Kichik reklama */}
      {smallBanners.map((sb) => (
        <div
          key={sb.id}
          className="mx-4 mb-3 rounded-card px-4 py-3.5 flex items-center justify-between"
          style={{ background: sb.tint }}
        >
          <div>
            <div className="text-[11px] text-brand-800 font-medium">{sb.eyebrow}</div>
            <div className="text-[15px] text-brand-text font-medium mt-0.5">{sb.title}</div>
          </div>
          <Icon name={sb.icon} size={38} color={sb.iconColor} />
        </div>
      ))}

      {/* Chegirmadagi taomlar */}
      {discounted.length > 0 && (
        <>
          <SectionHeader icon="discount" title="Chegirmadagi taomlar" />
          <div className="flex gap-2.5 px-4 pb-3.5 overflow-x-auto no-scrollbar">
            {discounted.map((d) => (
              <DishScrollCard key={d.id} dish={d} onClick={setModalDish} />
            ))}
          </div>
        </>
      )}

      {/* Barcha restoranlar */}
      <div className="text-base font-medium text-ink px-4 pt-1 pb-2.5">Barcha restoranlar</div>
      <div className="px-4 pb-4 flex flex-col gap-3">
        {filtered.map((r) => (
          <RestaurantCard key={r.id} restaurant={r} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-muted text-sm py-8">
            Bu kategoriyada hozircha restoran yo'q.
          </div>
        )}
      </div>

      <div className="flex-1" />
      <CartBar />
      <BottomNav />

      {modalDish && <DishModal dish={modalDish} onClose={() => setModalDish(null)} />}
    </div>
  );
}
