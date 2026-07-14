

export const banners = [
{ id: 'b1', eyebrow: 'TANLANGAN AKSIYA', title: "Birinchi buyurtmaga −30% chegirma", cta: 'Olish', bg: '#411E00', accentText: '#FAC775', ctaBg: '#EF9F27', ctaText: '#2C1400', icon: 'gift' },
{ id: 'b2', eyebrow: 'BEPUL YETKAZISH', title: "100 000 so'mdan ortiq buyurtmaga", cta: 'Buyurtma', bg: '#993C1D', accentText: '#F5C4B3', ctaBg: '#F0997B', ctaText: '#4A1B0C', icon: 'bike' },
{ id: 'b3', eyebrow: 'REKLAMA', title: 'Sushi Star — yangi ochildi', cta: "Ko'rish", bg: '#0F6E56', accentText: '#9FE1CB', ctaBg: '#5DCAA5', ctaText: '#04342C', icon: 'fish' }];


export const smallBanners = [
{ id: 'sb1', eyebrow: 'REKLAMA · SPONSOR', title: 'Coca-Cola bilan −15%', icon: 'bottle', tint: '#FAEEDA', iconColor: '#D85A30' }];


export const restaurants = [
{ id: 'r1', name: 'Milliy Taomlar', cuisine: 'Milliy oshxona', rating: 4.8, reviewCount: 320, deliveryMin: 25, deliveryMax: 35, deliveryFee: 0, category: 'milliy', tint: '#FAEEDA', icon: 'kitchen', discount: 30, images: ['photo-plov', 'photo-kabob'] },
{ id: 'r2', name: 'Sushi Star', cuisine: 'Yapon oshxonasi', rating: 4.7, reviewCount: 154, deliveryMin: 30, deliveryMax: 45, deliveryFee: 12000, category: 'sushi', tint: '#E1F5EE', icon: 'fish', isFresh: true, images: ['photo-sushi'] },
{ id: 'r3', name: 'Sweet Corner Kafe', cuisine: 'Kafe · Shirinliklar', rating: 4.6, reviewCount: 210, deliveryMin: 15, deliveryMax: 20, deliveryFee: 8000, category: 'kafe', tint: '#FBEAF0', icon: 'coffee', images: [] },
{ id: 'r4', name: 'Burger House', cuisine: 'Fast food', rating: 4.5, reviewCount: 98, deliveryMin: 20, deliveryMax: 30, deliveryFee: 10000, category: 'fastfood', tint: '#FCEBEB', icon: 'burger', images: ['photo-burger', 'photo-burger2'] }];


export const dishes = [
{
  id: 'd1', restaurantId: 'r1', section: 'Milliy taomlar', name: 'Osh (Palov)',
  description: "Toshkent uslubidagi an'anaviy palov: mol go'shti, sabzi, guruch va ziravorlar bilan qozonda tayyorlangan.",
  price: 38000, tint: '#FAEEDA', icon: 'bowl', photo: 'plov', calories: 620, weightGram: 320,
  ingredients: ['Guruch', "Mol go'shti", 'Sabzi', 'Piyoz', 'Zira'], isHit: true, isTrending: true,
  optionGroups: [
  { id: 'size', title: 'Porsiya hajmi', required: true, multiple: false, options: [{ id: 'sz1', name: 'Oddiy (320 g)', price: 0 }, { id: 'sz2', name: 'Katta (450 g)', price: 12000 }] },
  { id: 'extras', title: "Qo'shimchalar", required: false, multiple: true, options: [{ id: 'ex1', name: 'Achchiq qalampir', price: 3000 }, { id: 'ex2', name: "Qo'shimcha go'sht", price: 15000 }, { id: 'ex3', name: 'Achichuk salat', price: 8000 }] }]

},
{ id: 'd2', restaurantId: 'r1', section: 'Milliy taomlar', name: "Lag'mon", description: "Qo'lda cho'zilgan, sabzavotli, achchiq lag'mon.", price: 32000, oldPrice: 40000, tint: '#FAEEDA', icon: 'soup', photo: null, calories: 480, weightGram: 400, ingredients: ['Xamir', "Go'sht", 'Sabzavot', 'Ziravor'] },
{ id: 'd3', restaurantId: 'r1', section: 'Milliy taomlar', name: 'Manti (5 dona)', description: "Bug'da pishirilgan, go'shtli manti.", price: 28000, tint: '#FAEEDA', icon: 'meat', photo: 'manti', calories: 550, weightGram: 350 },
{ id: 'd4', restaurantId: 'r1', section: 'Shashlik', name: 'Kabob set (assorti)', description: "Mol, qo'y va tovuq shashlik.", price: 45000, oldPrice: 60000, tint: '#FCEBEB', icon: 'meat', photo: 'kabob', calories: 720, weightGram: 300, isTrending: true },
{ id: 'd5', restaurantId: 'r1', section: 'Shashlik', name: 'Jigar shashlik', description: "Dumba yog'i bilan, 3 sixcha.", price: 30000, tint: '#FAEEDA', icon: 'flame', photo: null, calories: 410, weightGram: 180 },
{ id: 'd6', restaurantId: 'r2', section: 'Sushi', name: 'Filadelfiya set', description: 'Losos, pishloq, avokado — 8 dona.', price: 89000, tint: '#E1F5EE', icon: 'fish', photo: 'sushi', calories: 380, weightGram: 260, isTrending: true },
{ id: 'd7', restaurantId: 'r2', section: 'Sushi', name: 'Kaliforniya rolli', description: 'Krab, avokado, ikra — 8 dona.', price: 62000, tint: '#E1F5EE', icon: 'fish', photo: null, calories: 340, weightGram: 240 },
{ id: 'd8', restaurantId: 'r3', section: 'Shirinliklar', name: 'Tiramisu', description: 'Klassik italyan shirinligi.', price: 34000, tint: '#FBEAF0', icon: 'cake', photo: 'tiramisu', calories: 420, weightGram: 150 },
{ id: 'd9', restaurantId: 'r3', section: 'Ichimliklar', name: 'Kapuchino', description: 'Yangi qovurilgan don kofe.', price: 18000, tint: '#FBEAF0', icon: 'coffee', photo: null, calories: 90, weightGram: 250 },
{ id: 'd10', restaurantId: 'r4', section: 'Burgerlar', name: 'Cheeseburger', description: "Mol go'shti, pishloq, achchiq sous.", price: 32000, tint: '#FCEBEB', icon: 'burger', photo: 'burger', calories: 540, weightGram: 280 }];


export const trendingDishIds = ['d1', 'd4', 'd6'];
export const discountedDishIds = ['d2', 'd4'];
export const courierNames = ['Jasur Bekov', 'Sardor Aliyev', 'Otabek Yusupov'];

export function seedReviews() {
  return {
    r1: [
    { name: 'Malika R.', rating: 5, comment: 'Osh juda mazali, tez yetkazishdi. Rahmat!', date: '2 kun oldin' },
    { name: 'Botir T.', rating: 4, comment: 'Yaxshi, lekin biroz kech keldi.', date: '5 kun oldin' }],

    r2: [{ name: 'Dilnoza S.', rating: 5, comment: 'Sushi juda yangi va chiroyli qadoqlangan.', date: '1 kun oldin' }],
    r3: [],
    r4: [{ name: 'Jahongir M.', rating: 4, comment: 'Burger yaxshi, porsiyasi katta.', date: '3 kun oldin' }]
  };
}
