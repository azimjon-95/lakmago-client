import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { BottomNav } from '@/components/BottomNav';
import { RestaurantCard } from '@/components/RestaurantCard';
import { DishGridCard } from '@/components/DishGridCard';
import { useUser } from '@/store/user';
import { useRestaurants, useAllDishes } from '@/hooks/queries';
import './Favorites.css';

export function FavoritesPage() {
  const navigate = useNavigate();
  // Ikkita alohida selector — obyekt yaratmaydi, barqaror havola
  const favRestIds = useUser((s) => s.user.favorites?.restaurants);
  const favDishIds = useUser((s) => s.user.favorites?.dishes);
  const { data: restaurants = [] } = useRestaurants();
  const { data: dishes = [] } = useAllDishes();

  const favRestaurants = useMemo(() => {
    const ids = new Set(favRestIds || []);
    return restaurants.filter((r) => ids.has(String(r.id || r._id)));
  }, [restaurants, favRestIds]);

  const favDishes = useMemo(() => {
    const ids = new Set(favDishIds || []);
    return dishes.filter((d) => ids.has(String(d.id || d._id)));
  }, [dishes, favDishIds]);

  const isEmpty = favRestaurants.length === 0 && favDishes.length === 0;

  return (
    <div className="app-shell fav">
      <header className="fav-header">
        <button onClick={() => navigate(-1)} aria-label="Orqaga" className="fav-header__btn">
          <Icon name="arrowLeft" size={22} color="#F7F2EA" />
        </button>
        <h1 className="fav-header__title">Sevimlilar</h1>
      </header>

      <div className="fav-body">
        {isEmpty ? (
          <div className="fav-empty">
            <Icon name="heart" size={52} color="#7D7264" />
            <div className="fav-empty__title">Sevimlilar bo'sh</div>
            <p className="fav-empty__hint">
              Restoran yoki taom sahifasida ♥ tugmasini bosing — shu yerda saqlanadi
            </p>
            <button onClick={() => navigate('/')} className="fav-empty__btn">
              Restoranlarni ko'rish
            </button>
          </div>
        ) : (
          <>
            {favDishes.length > 0 && (
              <>
                <h2 className="fav-section">Taomlar</h2>
                <div className="fav-dishes">
                  {favDishes.map((d) => (
                    <DishGridCard key={d.id || d._id} dish={d} />
                  ))}
                </div>
              </>
            )}

            {favRestaurants.length > 0 && (
              <>
                <h2 className="fav-section">Restoranlar</h2>
                <div className="fav-restaurants">
                  {favRestaurants.map((r) => (
                    <RestaurantCard key={r.id || r._id} restaurant={r} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
