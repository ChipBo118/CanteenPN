'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Leaf, Search, ShoppingBag, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiRequest, type ApiFailure } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { FavoriteButton } from '@/components/favorite-button';
import { productStockLabel } from '@/lib/product-stock';

type Category = { id: string; name: string; slug: string; _count: { products: number } };
type Product = { id: string; name: string; slug: string; description: string; basePrice: number; imageUrl?: string; preparationTimeMinutes: number; isVegetarian: boolean; isAvailable: boolean; inventoryAvailability?: string; averageRating: string; category: Category; recipes: { ingredients: { quantity: string; ingredient: { currentQuantity: string; reservedQuantity: string } }[] }[] };
type ProductResult = { items: Product[]; meta: { total: number } };
const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + ' ₫';

export function MenuClient() {
  const params = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const accessToken = useAuthStore(state => state.accessToken);
  const [search, setSearch] = useState(params.get('search') ?? '');
  const [category, setCategory] = useState(params.get('category') ?? '');
  const [sort, setSort] = useState('popular');
  const [filters, setFilters] = useState({ minPrice:'', maxPrice:'', minimumRating:'', vegetarian:false, available:true, maxPreparationTime:'' });
  const [message, setMessage] = useState('');
  const categories = useQuery({ queryKey: ['categories'], queryFn: () => apiRequest<Category[]>('/categories') });
  const productQuery = new URLSearchParams({ search, category, sort, limit:'60', available:String(filters.available) });
  if(filters.minPrice) productQuery.set('minPrice',filters.minPrice);
  if(filters.maxPrice) productQuery.set('maxPrice',filters.maxPrice);
  if(filters.minimumRating) productQuery.set('minRating',filters.minimumRating);
  if(filters.vegetarian) productQuery.set('vegetarian','true');
  if(filters.maxPreparationTime) productQuery.set('maxPreparationTime',filters.maxPreparationTime);
  const products = useQuery({ queryKey: ['products', productQuery.toString()], queryFn: () => apiRequest<ProductResult>(`/products?${productQuery}`) });

  async function add(product: Product) {
    if (!accessToken) { router.push('/auth/login'); return; }
    setMessage('');
    try {
      const cart = await apiRequest('/cart/items', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ productId: product.id, quantity: 1 }) });
      queryClient.setQueryData(['cart', accessToken], cart);
      setMessage(`Đã thêm ${product.name} vào giỏ.`);
    }
    catch (error) { setMessage((error as ApiFailure).message); }
  }

  return <>
    <section className="border-b bg-[radial-gradient(circle_at_85%_15%,#d7f0e5_0,transparent_30%),linear-gradient(135deg,#fbfaf5,#f4f8f2)] py-14 dark:bg-[linear-gradient(135deg,#0f1715,#14221e)]"><div className="container-shell"><p className="eyebrow">Thực đơn hôm nay</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.045em] sm:text-5xl">Món ngon, <span className="text-brand-600">sẵn sàng đúng giờ</span></h1><div className="mt-7 flex max-w-2xl items-center gap-3 rounded-[14px] border bg-[color:var(--surface)] px-5 py-1 shadow-soft"><Search size={20} className="text-brand-600"/><label htmlFor="menu-search" className="sr-only">Tìm món</label><input id="menu-search" value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 outline-none" placeholder="Tìm cơm, phở, đồ uống..." /></div></div></section>
    <section className="container-shell py-8">
      {message && <div role="status" className="mb-5 rounded-2xl bg-brand-50 p-4 font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-emerald-100">{message}</div>}
      <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-center lg:justify-between"><div className="flex gap-2 overflow-x-auto pb-2"><button onClick={() => setCategory('')} className={`whitespace-nowrap rounded-full px-4 py-2 font-bold ${!category ? 'bg-brand-600 text-white' : 'border bg-[color:var(--surface)]'}`}>Tất cả</button>{categories.data?.map(item => <button key={item.id} onClick={() => setCategory(item.slug)} className={`whitespace-nowrap rounded-full px-4 py-2 font-bold ${category === item.slug ? 'bg-brand-600 text-white' : 'border bg-[color:var(--surface)]'}`}>{item.name} · {item._count.products}</button>)}</div><select value={sort} onChange={event => setSort(event.target.value)} className="h-11 rounded-full border bg-[color:var(--surface)] px-4" aria-label="Sắp xếp"><option value="popular">Phổ biến</option><option value="rating">Đánh giá cao</option><option value="price-asc">Giá thấp đến cao</option><option value="price-desc">Giá cao đến thấp</option><option value="fastest">Chuẩn bị nhanh nhất</option></select></div>
      <div className="mt-5 grid gap-3 rounded-3xl border bg-[color:var(--surface)] p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input className="field" type="number" min="0" placeholder="Giá từ" value={filters.minPrice} onChange={event=>setFilters({...filters,minPrice:event.target.value})}/>
        <input className="field" type="number" min="0" placeholder="Giá đến" value={filters.maxPrice} onChange={event=>setFilters({...filters,maxPrice:event.target.value})}/>
        <select className="field" value={filters.minimumRating} onChange={event=>setFilters({...filters,minimumRating:event.target.value})} aria-label="Điểm tối thiểu"><option value="">Mọi đánh giá</option><option value="4">Từ 4 sao</option><option value="4.5">Từ 4,5 sao</option></select>
        <select className="field" value={filters.maxPreparationTime} onChange={event=>setFilters({...filters,maxPreparationTime:event.target.value})} aria-label="Thời gian chuẩn bị"><option value="">Mọi thời gian</option><option value="5">≤ 5 phút</option><option value="10">≤ 10 phút</option><option value="15">≤ 15 phút</option></select>
        <label className="flex items-center gap-2 rounded-2xl border px-4 text-sm font-bold"><input type="checkbox" checked={filters.vegetarian} onChange={event=>setFilters({...filters,vegetarian:event.target.checked})}/> Món chay</label>
        <label className="flex items-center gap-2 rounded-2xl border px-4 text-sm font-bold"><input type="checkbox" checked={filters.available} onChange={event=>setFilters({...filters,available:event.target.checked})}/> Còn món</label>
      </div>
      {products.isLoading ? <div className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-96 animate-pulse rounded-[22px] bg-emerald-100/50 dark:bg-white/5" />)}</div> : products.isError ? <div className="py-16 text-center"><p className="text-xl font-bold">Không thể tải thực đơn.</p><button className="button-primary mt-4" onClick={() => products.refetch()}>Thử lại</button></div> : !products.data?.items.length ? <div className="py-16 text-center"><p className="text-2xl font-extrabold">Chưa tìm thấy món phù hợp</p><p className="mt-2 text-[color:var(--muted)]">Thử từ khóa hoặc danh mục khác nhé.</p></div> : <div className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-3">{products.data.items.map(product => <article key={product.id} className="surface group overflow-hidden rounded-[22px] transition hover:-translate-y-1.5 hover:shadow-soft"><div className="relative h-[220px] overflow-hidden"><Link href={`/menu/${product.slug}`}><Image src={product.imageUrl ?? '/images/com-tam.jpg'} alt={product.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" /></Link><FavoriteButton productId={product.id} slug={product.slug} name={product.name}/>{product.isVegetarian && <span className="absolute left-3 top-3 flex items-center gap-1 rounded-[10px] bg-emerald-50 px-3 py-2 text-[10px] font-extrabold text-brand-700 shadow"><Leaf size={13} /> Món chay</span>}{!product.isAvailable&&<span className="absolute inset-0 grid place-items-center bg-brand-900/75 text-xl font-extrabold text-white">Tạm hết</span>}</div><div className="p-5"><div className="flex items-center gap-4 text-xs text-[color:var(--muted)]"><span className="flex items-center gap-1 text-amber-600"><Star size={14} className="fill-current"/> {Number(product.averageRating).toFixed(1)}</span><span className="flex items-center gap-1"><Clock3 size={14}/> {product.preparationTimeMinutes} phút</span></div><Link href={`/menu/${product.slug}`}><h2 className="mt-3 text-xl font-extrabold hover:text-brand-600">{product.name}</h2></Link><p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-[color:var(--muted)]">{product.description}</p><div className="mt-5 flex items-end justify-between"><div><strong className="text-lg text-brand-600">{money(product.basePrice)}</strong><small className="block text-[10px] text-[color:var(--muted)]">{product.category.name}</small><small className="mt-1 block text-xs font-bold text-brand-600">Tồn: {productStockLabel(product.recipes)}</small></div><button onClick={() => add(product)} disabled={!product.isAvailable} className="flex h-10 items-center gap-1 rounded-xl bg-brand-50 px-3 text-xs font-bold text-brand-700 hover:bg-brand-600 hover:text-white disabled:bg-slate-100 disabled:text-slate-400" aria-label={`Thêm ${product.name} vào giỏ`}><ShoppingBag size={16}/> Thêm</button></div></div></article>)}</div>}
    </section>
  </>;
}
