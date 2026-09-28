'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Leaf, ShoppingBag, Star } from 'lucide-react';
import { useState } from 'react';
import { FavoriteButton } from '@/components/favorite-button';
import { LoadingState } from '@/components/loading-state';
import { apiRequest, authHeaders, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl?: string;
  isVegetarian: boolean;
  preparationTimeMinutes: number;
  averageRating: string;
  totalReviews: number;
  variants: { id: string; name: string; priceAdjustment: number }[];
  optionGroups: { optionGroup: { id: string; name: string; values: { id: string; name: string; priceAdjustment: number }[] } }[];
  reviews: { id: string; rating: number; comment?: string; studentProfile: { studentDirectory: { fullName: string } } }[];
};

export function ProductDetail({ slug }: { slug: string }) {
  const token = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();
  const [variantId, setVariant] = useState<string>();
  const [optionValueIds, setOptions] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const product = useQuery({ queryKey: ['product', slug], queryFn: () => apiRequest<Product>(`/products/${slug}`) });
  const add = useMutation({
    mutationFn: () => apiRequest('/cart/items', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({ productId: product.data?.id, variantId, optionValueIds, quantity: 1 })
    }),
    onSuccess: cart => {
      queryClient.setQueryData(['cart', token], cart);
      setMessage('Đã thêm món vào giỏ hàng.');
    },
    onError: (error: Error) => setMessage(error.message ?? 'Vui lòng đăng nhập')
  });

  if (product.isLoading || !product.data) return <LoadingState />;
  const item = product.data;

  return <div className="grid gap-8 lg:grid-cols-2">
    <div className="min-h-[430px] overflow-hidden rounded-4xl bg-gradient-to-br from-brand-100 to-amber-100">
      <img src={item.imageUrl ?? '/images/default-student-avatar.svg'} alt={item.name} className="h-full w-full object-cover" />
    </div>
    <div>
      <div className="flex flex-wrap gap-2">
        {item.isVegetarian && <span className="status-pill"><Leaf size={14} /> Món chay</span>}
        <span className="status-pill"><Clock3 size={14} /> {item.preparationTimeMinutes} phút</span>
        <span className="status-pill"><Star size={14} /> {item.averageRating} ({item.totalReviews})</span>
      </div>
      <h1 className="mt-5 text-4xl font-black">{item.name}</h1>
      <p className="mt-4 text-2xl font-black text-brand-600">Từ {formatMoney(item.basePrice)}</p>
      <p className="mt-5 leading-7 text-[color:var(--muted)]">{item.description}</p>

      {item.variants.length > 0 && <fieldset className="mt-6">
        <legend className="font-black">Chọn kích cỡ</legend>
        <div className="mt-3 flex flex-wrap gap-2">{item.variants.map(variant => <button type="button" key={variant.id} onClick={() => setVariant(variant.id)} className={variantId === variant.id ? 'button-primary' : 'button-secondary'}>{variant.name} {variant.priceAdjustment ? `+${formatMoney(variant.priceAdjustment)}` : ''}</button>)}</div>
      </fieldset>}

      {item.optionGroups.map(({ optionGroup }) => <fieldset key={optionGroup.id} className="mt-6">
        <legend className="font-black">{optionGroup.name}</legend>
        <div className="mt-3 flex flex-wrap gap-2">{optionGroup.values.map(value => <button type="button" key={value.id} onClick={() => setOptions(current => current.includes(value.id) ? current.filter(id => id !== value.id) : [...current, value.id])} className={optionValueIds.includes(value.id) ? 'button-primary' : 'button-secondary'}>{value.name}</button>)}</div>
      </fieldset>)}

      {message && <p className="mt-5 rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">{message}</p>}
      <div className="mt-7 flex gap-3">
        <button type="button" onClick={() => add.mutate()} disabled={add.isPending} className="button-primary flex-1"><ShoppingBag size={18} />{add.isPending ? 'Đang thêm…' : 'Thêm vào giỏ'}</button>
        <FavoriteButton productId={item.id} slug={item.slug} name={item.name} className="button-secondary" />
      </div>

      <section className="mt-10 border-t pt-7">
        <h2 className="text-xl font-black">Đánh giá gần đây</h2>
        <div className="mt-4 space-y-3">{item.reviews.map(review => <div key={review.id} className="rounded-2xl border p-4"><p className="font-bold">{review.studentProfile.studentDirectory.fullName} · {'★'.repeat(review.rating)}</p><p className="mt-1 text-sm text-[color:var(--muted)]">{review.comment ?? 'Không có nhận xét.'}</p></div>)}</div>
      </section>
    </div>
  </div>;
}
