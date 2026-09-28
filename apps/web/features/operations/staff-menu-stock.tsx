'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, PackageCheck, PackageX, Search, UtensilsCrossed } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { apiRequest, formatMoney } from '@/lib/api';
import { estimateProductStock } from '@/lib/product-stock';

type MenuStock = {
  id: string;
  name: string;
  imageUrl?: string;
  category: string;
  basePrice: number;
  estimatedStock: number | null;
  isAvailable: boolean;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'UNTRACKED';
};

type CatalogProduct = {
  id: string;
  name: string;
  imageUrl?: string;
  category: { name: string };
  basePrice: number;
  isAvailable: boolean;
  recipes: {
    ingredients: {
      quantity: string;
      ingredient: { currentQuantity: string; reservedQuantity: string };
    }[];
  }[];
};

type CatalogResponse = { items: CatalogProduct[] };

function toMenuStock(product: CatalogProduct): MenuStock {
  const estimatedStock = estimateProductStock(product.recipes);
  const isAvailable = product.isAvailable && (estimatedStock === null || estimatedStock > 0);
  const stockStatus: MenuStock['stockStatus'] = !isAvailable
    ? 'OUT_OF_STOCK'
    : estimatedStock === null
      ? 'UNTRACKED'
      : estimatedStock <= 10
        ? 'LOW_STOCK'
        : 'IN_STOCK';

  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl,
    category: product.category.name,
    basePrice: product.basePrice,
    estimatedStock,
    isAvailable,
    stockStatus,
  };
}

const stockLabels = {
  IN_STOCK: 'Còn món',
  LOW_STOCK: 'Sắp hết',
  OUT_OF_STOCK: 'Hết món',
  UNTRACKED: 'Chưa định lượng',
} as const;

const stockStyles = {
  IN_STOCK: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100',
  LOW_STOCK: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100',
  OUT_OF_STOCK: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-100',
  UNTRACKED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
} as const;

export function StaffMenuStock() {
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['staff-menu-stock'],
    queryFn: async () => {
      const response = await apiRequest<CatalogResponse>('/products?page=1&limit=100');
      return response.items.map(toMenuStock);
    },
    refetchInterval: 20_000,
  });
  const rows = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase('vi');
    if (!keyword) return query.data ?? [];
    return (query.data ?? []).filter(item => `${item.name} ${item.category}`.toLocaleLowerCase('vi').includes(keyword));
  }, [query.data, search]);

  if (query.isLoading) return <LoadingState />;

  const items = query.data ?? [];
  const inStock = items.filter(item => item.stockStatus === 'IN_STOCK').length;
  const lowStock = items.filter(item => item.stockStatus === 'LOW_STOCK').length;
  const outOfStock = items.filter(item => item.stockStatus === 'OUT_OF_STOCK').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="surface rounded-2xl p-4"><UtensilsCrossed className="text-brand-600" size={20}/><span className="mt-3 block text-xs text-[color:var(--muted)]">Tổng số món</span><strong className="mt-1 block text-2xl">{items.length}</strong></article>
        <article className="surface rounded-2xl p-4"><PackageCheck className="text-emerald-600" size={20}/><span className="mt-3 block text-xs text-[color:var(--muted)]">Còn món</span><strong className="mt-1 block text-2xl">{inStock}</strong></article>
        <article className="surface rounded-2xl p-4"><AlertTriangle className="text-amber-600" size={20}/><span className="mt-3 block text-xs text-[color:var(--muted)]">Sắp hết</span><strong className="mt-1 block text-2xl">{lowStock}</strong></article>
        <article className="surface rounded-2xl p-4"><PackageX className="text-red-600" size={20}/><span className="mt-3 block text-xs text-[color:var(--muted)]">Hết món</span><strong className="mt-1 block text-2xl">{outOfStock}</strong></article>
      </div>

      <label className="relative block max-w-md">
        <Search size={18} className="absolute left-4 top-3.5 text-[color:var(--muted)]" />
        <input className="field pl-11" value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm món ăn hoặc danh mục…" />
      </label>

      {query.isError && <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{(query.error as Error).message}</p>}
      {rows.length ? (
        <div className="table-shell">
          <table className="data-table">
            <thead><tr><th>Món ăn</th><th>Danh mục</th><th className="text-right">Giá</th><th className="text-center">Số suất còn lại</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {rows.map(item => (
                <tr key={item.id}>
                  <td><div className="flex items-center gap-3"><img src={item.imageUrl ?? '/images/default-student-avatar.svg'} alt="" className="h-12 w-12 rounded-xl object-cover"/><strong>{item.name}</strong></div></td>
                  <td>{item.category}</td>
                  <td className="text-right font-bold text-brand-600">{formatMoney(item.basePrice)}</td>
                  <td className="text-center text-lg font-black">{item.estimatedStock ?? '—'}</td>
                  <td><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${stockStyles[item.stockStatus]}`}>{stockLabels[item.stockStatus]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !query.isError && <EmptyState title="Không tìm thấy món ăn" />}
      <p className="text-xs leading-5 text-[color:var(--muted)]">Số suất còn lại được ước tính từ nguyên liệu khả dụng và định lượng công thức. Dấu “—” nghĩa là món chưa có công thức định lượng.</p>
    </div>
  );
}
