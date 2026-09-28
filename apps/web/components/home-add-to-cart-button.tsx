'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ShoppingBag } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { apiRequest, type ApiFailure } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Product = { id: string };

export function HomeAddToCartButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore(state => state.accessToken);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function addToCart() {
    if (!token) {
      router.push('/auth/login');
      return;
    }

    setStatus('loading');
    setError('');
    try {
      const product = await apiRequest<Product>(`/products/${slug}`);
      const cart = await apiRequest('/cart/items', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId: product.id, quantity: 1 })
      });
      queryClient.setQueryData(['cart', token], cart);
      setStatus('success');
      window.setTimeout(() => setStatus('idle'), 1800);
    } catch (caught) {
      setError((caught as ApiFailure).message ?? `Không thể thêm ${name} vào giỏ.`);
      setStatus('error');
    }
  }

  return <div className="relative">
    <button
      type="button"
      onClick={addToCart}
      disabled={status === 'loading'}
      className="flex h-10 items-center gap-1 rounded-xl bg-brand-50 px-3 text-xs font-bold text-brand-700 hover:bg-brand-600 hover:text-white disabled:cursor-wait disabled:opacity-60"
      aria-label={`Thêm ${name} vào giỏ`}
    >
      <ShoppingBag size={16} />
      {status === 'loading' ? 'Đang thêm…' : status === 'success' ? 'Đã thêm' : 'Thêm'}
    </button>
    {status === 'error' && <span role="alert" className="absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-red-600 p-2 text-xs font-semibold text-white shadow-lg">{error}</span>}
  </div>;
}
