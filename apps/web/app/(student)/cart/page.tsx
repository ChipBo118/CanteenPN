import { StudentHeader } from '@/components/student-header';
import { CartClient } from '@/features/cart/cart-client';

export default function CartPage() { return <><StudentHeader /><main className="container-shell py-10"><p className="eyebrow">Đơn hàng của bạn</p><h1 className="mt-2 mb-8 text-4xl font-black">Giỏ hàng</h1><CartClient /></main></>; }

