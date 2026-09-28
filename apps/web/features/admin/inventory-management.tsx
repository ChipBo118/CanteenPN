'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, PackageCheck, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { LoadingState } from '@/components/loading-state';
import { apiRequest, authHeaders, formatQuantity } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  currentQuantity: string;
  reservedQuantity: string;
  lowStockThreshold: string;
  reorderThreshold: string;
  costPerUnit: number;
  active: boolean;
};

export function InventoryManagement() {
  const token = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['inventory-crud'],
    queryFn: () => apiRequest<Ingredient[]>('/admin/ingredients', { headers: authHeaders(token) }),
    enabled: !!token,
  });
  const mutation = useMutation({
    mutationFn: ({ url, method, body }: { url: string; method: string; body?: unknown }) => apiRequest(url, { method, headers: authHeaders(token), body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory-crud'] }),
  });

  const askNumber = (label: string, initial: number) => {
    const value = window.prompt(label, String(initial));
    if (value === null || value.trim() === '' || !Number.isFinite(Number(value))) return undefined;
    return Number(value);
  };
  function create() {
    const name = window.prompt('Tên nguyên liệu')?.trim(); if (!name) return;
    const unit = window.prompt('Đơn vị', 'kg')?.trim(); if (!unit) return;
    const currentQuantity = askNumber('Số lượng hiện tại', 0); const lowStockThreshold = askNumber('Ngưỡng sắp hết', 10); const reorderThreshold = askNumber('Ngưỡng nhập lại', 20); const costPerUnit = askNumber('Giá mỗi đơn vị', 0);
    if ([currentQuantity, lowStockThreshold, reorderThreshold, costPerUnit].some(value => value === undefined)) return;
    mutation.mutate({ url: '/admin/ingredients', method: 'POST', body: { name, unit, currentQuantity, lowStockThreshold, reorderThreshold, costPerUnit } });
  }
  function edit(item: Ingredient) {
    const name = window.prompt('Tên nguyên liệu', item.name)?.trim(); if (!name) return;
    const unit = window.prompt('Đơn vị', item.unit)?.trim(); if (!unit) return;
    const currentQuantity = askNumber('Số lượng hiện tại', Number(item.currentQuantity)); const lowStockThreshold = askNumber('Ngưỡng sắp hết', Number(item.lowStockThreshold)); const reorderThreshold = askNumber('Ngưỡng nhập lại', Number(item.reorderThreshold)); const costPerUnit = askNumber('Giá mỗi đơn vị', item.costPerUnit);
    if ([currentQuantity, lowStockThreshold, reorderThreshold, costPerUnit].some(value => value === undefined)) return;
    mutation.mutate({ url: `/admin/ingredients/${item.id}`, method: 'PATCH', body: { name, unit, currentQuantity, lowStockThreshold, reorderThreshold, costPerUnit } });
  }
  function remove(item: Ingredient) { if (window.confirm(`Xóa nguyên liệu “${item.name}”?`)) mutation.mutate({ url: `/admin/ingredients/${item.id}`, method: 'DELETE' }); }

  if (query.isLoading) return <LoadingState />;

  const ingredients = (query.data ?? [])
    .map(ingredient => ({
      ...ingredient,
      availableQuantity: Number(ingredient.currentQuantity) - Number(ingredient.reservedQuantity),
    }))
    .filter(ingredient => ingredient.active);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><h2 className="mt-2 text-3xl font-black">Danh sách kho hàng</h2><p className="mt-2 text-sm text-[color:var(--muted)]">Số lượng khả dụng sau khi trừ phần đang giữ cho các đơn hàng.</p></div>
        <div className="flex gap-2"><button onClick={() => query.refetch()} className="button-secondary"><RefreshCw size={17}/>Làm mới</button><button onClick={create} className="button-primary"><Plus size={17}/>Thêm nguyên liệu</button></div>
      </div>
      {mutation.isError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{(mutation.error as Error).message}</p>}
      {mutation.isSuccess && <p className="rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">Danh sách kho đã được cập nhật.</p>}

      {ingredients.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ingredients.map(ingredient => {
            const isLow = ingredient.availableQuantity <= Number(ingredient.lowStockThreshold);
            return (
              <article key={ingredient.id} className={`surface rounded-3xl p-5 ${isLow ? 'border-red-300' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-black">{ingredient.name}</h3>
                    <p className="mt-3 text-3xl font-black">
                      {formatQuantity(ingredient.availableQuantity)}{' '}
                      <small className="text-base">{ingredient.unit}</small>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">{isLow ? <AlertTriangle className="text-red-500" /> : <PackageCheck className="text-brand-600" />}<button onClick={() => edit(ingredient)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-slate-100" aria-label="Sửa nguyên liệu"><Pencil size={16}/></button><button onClick={() => remove(ingredient)} className="grid h-9 w-9 place-items-center rounded-full text-red-600 hover:bg-red-50" aria-label="Xóa nguyên liệu"><Trash2 size={16}/></button></div>
                </div>
                {isLow && <p className="mt-4 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-800">Sắp hết hàng</p>}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="surface rounded-3xl p-8 text-center text-sm text-[color:var(--muted)]">Không còn nguyên liệu khả dụng trong kho.</div>
      )}
    </div>
  );
}
