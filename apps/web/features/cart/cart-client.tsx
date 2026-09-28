'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type CartItem = { id: string; quantity: number; note?: string; product?: { name: string; basePrice: number }; combo?: { name: string; calculatedPrice: number }; variant?: { name: string; priceAdjustment: number }; options: { optionValue: { name: string; priceAdjustment: number } }[] };
type Cart = { items: CartItem[] };
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';

export function CartClient() {
  const token = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();
  const cart = useQuery({ queryKey: ['cart', token], enabled: Boolean(token), refetchOnMount: 'always', queryFn: () => apiRequest<Cart>('/cart', { headers: { Authorization: `Bearer ${token}` } }) });
  async function update(item: CartItem, quantity: number) { if (quantity < 1) return remove(item.id); await apiRequest(`/cart/items/${item.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ quantity }) }); await queryClient.invalidateQueries({ queryKey: ['cart'] }); }
  async function remove(id: string) { await apiRequest(`/cart/items/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }); await queryClient.invalidateQueries({ queryKey: ['cart'] }); }
  if (!token) return <div className="surface rounded-4xl p-10 text-center"><ShoppingBag className="mx-auto text-brand-600" size={42} /><h2 className="mt-4 text-2xl font-black">Đăng nhập để xem giỏ hàng</h2><Link className="button-primary mt-5" href="/auth/login">Đăng nhập</Link></div>;
  if (cart.isLoading) return <div className="h-72 animate-pulse rounded-4xl bg-emerald-100/50" />;
  if (!cart.data?.items.length) return <div className="surface rounded-4xl p-10 text-center"><ShoppingBag className="mx-auto text-brand-600" size={42} /><h2 className="mt-4 text-2xl font-black">Giỏ hàng đang trống</h2><p className="mt-2 text-[color:var(--muted)]">Hãy chọn một món thật ngon cho giờ nghỉ.</p><Link className="button-primary mt-5" href="/menu">Xem thực đơn</Link></div>;
  const total = cart.data.items.reduce((sum, item) => sum + ((item.product?.basePrice ?? item.combo?.calculatedPrice ?? 0) + (item.variant?.priceAdjustment ?? 0) + item.options.reduce((value, option) => value + option.optionValue.priceAdjustment, 0)) * item.quantity, 0);
  return <div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-4">{cart.data.items.map(item => <article key={item.id} className="surface flex flex-col gap-4 rounded-3xl p-5 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><h2 className="text-lg font-black">{item.product?.name ?? item.combo?.name}</h2><p className="mt-1 text-sm text-[color:var(--muted)]">{[item.variant?.name, ...item.options.map(option => option.optionValue.name)].filter(Boolean).join(' · ') || 'Phần tiêu chuẩn'}</p>{item.note && <p className="mt-2 text-sm italic">“{item.note}”</p>}</div><strong className="text-brand-600">{money(((item.product?.basePrice ?? item.combo?.calculatedPrice ?? 0) + (item.variant?.priceAdjustment ?? 0)) * item.quantity)}</strong><div className="flex items-center gap-2"><button onClick={() => update(item, item.quantity - 1)} className="grid h-10 w-10 place-items-center rounded-full border" aria-label="Giảm số lượng"><Minus size={16} /></button><span className="w-8 text-center font-bold">{item.quantity}</span><button onClick={() => update(item, item.quantity + 1)} className="grid h-10 w-10 place-items-center rounded-full border" aria-label="Tăng số lượng"><Plus size={16} /></button><button onClick={() => remove(item.id)} className="ml-2 grid h-10 w-10 place-items-center rounded-full text-red-600" aria-label="Xóa món"><Trash2 size={18} /></button></div></article>)}</div><aside className="surface h-fit rounded-4xl p-6 lg:sticky lg:top-24"><h2 className="text-xl font-black">Tóm tắt giỏ hàng</h2><div className="mt-5 flex justify-between text-[color:var(--muted)]"><span>Tạm tính</span><span>{money(total)}</span></div><div className="my-5 border-t" /><div className="flex justify-between text-xl font-black"><span>Dự kiến</span><span className="text-brand-600">{money(total)}</span></div><p className="mt-3 text-xs leading-5 text-[color:var(--muted)]">Giá cuối cùng, coupon, voucher và điểm sẽ được xác nhận bởi máy chủ ở bước tiếp theo.</p><Link href="/checkout" className="button-primary mt-6 w-full">Tiếp tục thanh toán</Link></aside></div>;
}
