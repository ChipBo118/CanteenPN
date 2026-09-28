import { StudentHeader } from '@/components/student-header';
import { CheckoutClient } from '@/features/checkout/checkout-client';

export default function CheckoutPage() { return <><StudentHeader /><main className="container-shell py-10"><p className="eyebrow">Thanh toán an toàn</p><h1 className="mt-2 mb-8 text-4xl font-black">Hoàn tất đơn hàng</h1><CheckoutClient /></main></>; }
