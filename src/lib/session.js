import { useUser } from '@/store/user';
import { useCart } from '@/store/cart';
import { queryClient } from '@/lib/queryClient';
import { clearTgLoginCache } from '@/lib/tgLinkAuth';

/*
 * Hisobdan CHIQISH (va hisob o'chirilgandan keyin): hamma narsa tozalanadi, ilova MEHMON holatiga qaytadi.
 *  • server sessiyasi bekor qilinadi, tokenlar o'chadi (store.logout);
 *  • savat tozalanadi (keyingi hisobga oldingi savat o'tib ketmasin — ayniqsa demo ↔ haqiqiy);
 *  • TanStack kesh tozalanadi (oldingi foydalanuvchining buyurtmalari/profili ko'rinmasin);
 *  • kirish oynasining vaqtinchalik holati tozalanadi.
 */
export async function signOut() {
  await useUser.getState().logout();
  try { useCart.getState().clear(); } catch { /* */ }
  try { queryClient.clear(); } catch { /* */ }
  try { clearTgLoginCache(); } catch { /* */ }
  try { sessionStorage.removeItem('lokma_profile_auth_prompt'); } catch { /* */ }
}
