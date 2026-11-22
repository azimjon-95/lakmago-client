import { Skeleton } from '../Skeleton/Skeleton';
import './HomeDishCard.css';

// «Super Chegirmalar» / «Tavsiya qilamiz» kartasi skeletoni (HomeDishCard bilan bir xil o'lcham)
export function HomeDishCardSkeleton() {
  return (
    <div className="hdc-skel">
      <Skeleton w="100%" h="auto" r={0} className="hdc-skel__photo" />
      <div className="hdc-skel__body">
        <Skeleton w="80%" h={13} />
        <Skeleton w="55%" h={11} />
        <Skeleton w="60%" h={16} style={{ marginTop: 6 }} />
      </div>
    </div>
  );
}
