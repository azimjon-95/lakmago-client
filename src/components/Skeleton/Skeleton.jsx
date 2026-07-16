import './Skeleton.css';

// Asosiy skeleton bo'lagi (shimmer animatsiyali)
export function Skeleton({ w, h, r = 8, className = '', style = {} }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ width: w, height: h, borderRadius: r, ...style }}
    />
  );
}

// Restoran kartasi skeletoni (bosh sahifa)
export function RestaurantCardSkeleton() {
  return (
    <div className="skel-rcard">
      <Skeleton w="100%" h={124} r={14} />
      <div className="skel-rcard__body">
        <Skeleton w="60%" h={16} />
        <Skeleton w="85%" h={12} style={{ marginTop: 8 }} />
      </div>
    </div>
  );
}

// Gorizontal taom kartasi skeletoni (trend/chegirma)
export function DishScrollСardSkeleton() {
  return (
    <div className="skel-dscard">
      <Skeleton w={150} h={112} r={14} />
      <Skeleton w={110} h={13} style={{ marginTop: 8 }} />
      <Skeleton w={70} h={12} style={{ marginTop: 6 }} />
    </div>
  );
}

// Menyu qatori skeletoni (restoran sahifasi)
export function DishRowSkeleton() {
  return (
    <div className="skel-drow">
      <Skeleton w={88} h={88} r={14} />
      <div className="skel-drow__body">
        <Skeleton w="70%" h={15} />
        <Skeleton w="40%" h={11} style={{ marginTop: 6 }} />
        <Skeleton w="90%" h={12} style={{ marginTop: 8 }} />
        <Skeleton w="30%" h={16} style={{ marginTop: 10 }} />
      </div>
    </div>
  );
}

// Banner skeletoni
export function BannerSkeleton() {
  return <Skeleton w="calc(100% - 32px)" h={130} r={18} style={{ margin: '0 16px 8px' }} />;
}
