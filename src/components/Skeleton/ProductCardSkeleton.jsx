import { Skeleton } from './Skeleton';
import './ProductCardSkeleton.css';

/* Mahsulot kartasi shaklidagi skeleton (DishGridCard bilan bir xil o'lcham — yuklangach sakramaydi) */
export function ProductCardSkeleton({ photoHeight = 88 }) {
  return (
    <div className="pcskel" aria-hidden="true">
      <Skeleton w="100%" h={photoHeight} r={0} />
      <div className="pcskel__body">
        <Skeleton w="92%" h={11} r={6} />
        <Skeleton w="62%" h={11} r={6} style={{ marginTop: 6 }} />
        <div className="pcskel__row">
          <Skeleton w="46%" h={14} r={6} />
          <Skeleton w={26} h={26} r={9} />
        </div>
      </div>
    </div>
  );
}
