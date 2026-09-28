'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Power, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { apiRequest, authHeaders, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type ProductVariant = { id: string; name: string; priceAdjustment: number; active: boolean };
type Product = { id: string; name: string; basePrice: number; variants: ProductVariant[] };
type ComboItem = { id: string; productId: string; variantId?: string | null; quantity: number; product: Product; variant?: ProductVariant | null };
type Combo = { id: string; name: string; slug: string; description: string; originalPrice: number; calculatedPrice: number; discountPercentage: number; isActive: boolean; items: ComboItem[] };
type ComboItemForm = { productId: string; variantId: string; quantity: number };
type ComboForm = { name: string; slug: string; description: string; items: ComboItemForm[] };

const blankForm = (): ComboForm => ({ name: '', slug: '', description: '', items: [{ productId: '', variantId: '', quantity: 1 }, { productId: '', variantId: '', quantity: 1 }] });

function makeSlug(value: string, existing: string[] = []) {
  const base = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'combo';
  const used = new Set(existing);
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

export function ComboManagement() {
  const token = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ComboForm>(blankForm());
  const [editing, setEditing] = useState<Combo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const combos = useQuery({ queryKey: ['combos-crud'], queryFn: () => apiRequest<Combo[]>('/admin/combos', { headers: authHeaders(token) }), enabled: !!token });
  const products = useQuery({ queryKey: ['products-combo'], queryFn: () => apiRequest<Product[]>('/admin/products', { headers: authHeaders(token) }), enabled: !!token });

  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['combos-crud'] }); };
  const save = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: ComboForm }) => apiRequest<Combo>(id ? `/admin/combos/${id}` : '/admin/combos', {
      method: id ? 'PATCH' : 'POST', headers: authHeaders(token), body: JSON.stringify(data),
    }),
    onSuccess: (_value, variables) => {
      setDialogOpen(false);
      setEditing(null);
      setForm(blankForm());
      setMessage(variables.id ? 'Đã cập nhật combo.' : 'Đã tạo combo.');
      refresh();
    },
    onError: (error: Error) => setMessage(error.message || 'Không thể lưu combo.'),
  });
  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ComboForm> & { isActive?: boolean } }) => apiRequest(`/admin/combos/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data) }),
    onSuccess: refresh,
    onError: (error: Error) => setMessage(error.message || 'Không thể cập nhật combo.'),
  });

  const estimatedOriginalPrice = useMemo(() => form.items.reduce((sum, item) => {
    const product = products.data?.find(entry => entry.id === item.productId);
    const variant = product?.variants.find(entry => entry.id === item.variantId);
    return sum + ((product?.basePrice ?? 0) + (variant?.priceAdjustment ?? 0)) * (Number(item.quantity) || 0);
  }, 0), [form.items, products.data]);
  const canSave = form.name.trim().length > 0 && form.slug.trim().length > 0 && form.items.length >= 2 && form.items.every(item => item.productId && Number.isInteger(Number(item.quantity)) && Number(item.quantity) > 0) && new Set(form.items.map(item => item.productId)).size === form.items.length;

  const openCreate = () => { setEditing(null); setForm(blankForm()); setMessage(''); setDialogOpen(true); };
  const openEdit = (combo: Combo) => {
    setEditing(combo);
    setForm({ name: combo.name, slug: combo.slug, description: combo.description, items: combo.items.map(item => ({ productId: item.productId, variantId: item.variantId ?? '', quantity: item.quantity })) });
    setMessage('');
    setDialogOpen(true);
  };

  if (combos.isLoading || products.isLoading) return <LoadingState />;

  const setItem = (index: number, value: Partial<ComboItemForm>) => setForm(current => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...value } : item) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="mt-2 text-3xl font-black">Combo</h2></div><button onClick={openCreate} className="button-primary"><Plus size={17} />Tạo combo</button></div>
      {message && <p role="status" className="rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">{message}</p>}
      {combos.data?.length ? <div className="grid gap-4 xl:grid-cols-2">{combos.data.map(combo => <article key={combo.id} className="surface rounded-3xl p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="text-xl font-black">{combo.name}</h3><p className="mt-1 text-sm text-[color:var(--muted)]">{combo.description || 'Không có mô tả'}</p><p className="mt-2 text-xs text-[color:var(--muted)]">{combo.items.map(item => `${item.product.name}${item.variant ? ` (${item.variant.name})` : ''} × ${item.quantity}`).join(' · ')}</p></div><StatusBadge value={combo.isActive ? 'ACTIVE' : 'INACTIVE'} /></div>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm line-through opacity-50">{formatMoney(combo.originalPrice)}</p><p className="text-2xl font-black text-brand-600">{formatMoney(combo.calculatedPrice)} <span className="text-sm font-bold">(-{combo.discountPercentage}%)</span></p></div><div className="flex gap-2"><button onClick={() => openEdit(combo)} className="button-secondary"><Pencil size={16} />Sửa</button><button onClick={() => { const isActive = !combo.isActive; update.mutate({ id: combo.id, data: { isActive } }); }} className={`grid h-11 w-11 place-items-center rounded-full border ${combo.isActive ? 'text-red-600' : 'text-brand-700'}`} aria-label={combo.isActive ? `Ngừng bán ${combo.name}` : `Bật bán ${combo.name}`} title={combo.isActive ? 'Ngừng bán' : 'Bật bán'}><Power size={16} /></button></div></div>
      </article>)}</div> : <EmptyState title="Chưa có combo" />}

      {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="combo-dialog-title" className="surface my-auto w-full max-w-3xl rounded-3xl p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><h3 id="combo-dialog-title" className="mt-2 text-2xl font-black">{editing ? 'Sửa combo' : 'Tạo combo mới'}</h3></div><button onClick={() => setDialogOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border" aria-label="Đóng"><X size={18} /></button></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Tên combo</span><input className="field" value={form.name} onChange={event => { const name = event.target.value; const otherSlugs = combos.data?.filter(combo => combo.id !== editing?.id).map(combo => combo.slug) ?? []; setForm(current => ({ ...current, name, slug: makeSlug(name, otherSlugs) })); }} /></label><label className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Mô tả</span><input className="field" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></label></div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3"><div><h4 className="font-black">Món trong combo</h4></div><button onClick={() => setForm(current => ({ ...current, items: [...current.items, { productId: '', variantId: '', quantity: 1 }] }))} className="button-secondary"><Plus size={16} />Thêm món</button></div>
          <div className="mt-3 space-y-3">{form.items.map((item, index) => {
            const selectedProduct = products.data?.find(product => product.id === item.productId);
            const selectedIds = new Set(form.items.filter((_entry, itemIndex) => itemIndex !== index).map(entry => entry.productId).filter(Boolean));
            return <div key={index} className="grid gap-3 rounded-2xl border p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_100px_44px] sm:items-end">
              <label><span className="mb-2 block text-xs font-bold">Món {index + 1}</span><select className="field" value={item.productId} onChange={event => setItem(index, { productId: event.target.value, variantId: '' })}><option value="">Chọn món</option>{products.data?.map(product => <option key={product.id} value={product.id} disabled={selectedIds.has(product.id)}>{product.name} · {formatMoney(product.basePrice)}</option>)}</select></label>
              <label><span className="mb-2 block text-xs font-bold">Biến thể</span><select className="field" value={item.variantId} disabled={!selectedProduct?.variants.length} onChange={event => setItem(index, { variantId: event.target.value })}><option value="">Mặc định</option>{selectedProduct?.variants.filter(variant => variant.active).map(variant => <option key={variant.id} value={variant.id}>{variant.name} · {formatMoney(variant.priceAdjustment)}</option>)}</select></label>
              <label><span className="mb-2 block text-xs font-bold">Số lượng</span><input className="field" type="number" min={1} step={1} value={item.quantity} onChange={event => setItem(index, { quantity: Number(event.target.value) })} /></label>
              <button onClick={() => setForm(current => ({ ...current, items: current.items.filter((_entry, itemIndex) => itemIndex !== index) }))} disabled={form.items.length <= 2} className="grid h-11 w-11 place-items-center rounded-full border text-red-600 disabled:opacity-30" aria-label={`Xóa món ${index + 1}`} title="Xóa món"><Trash2 size={16} /></button>
            </div>;
          })}</div>
          <div className="mt-5 flex flex-wrap justify-between gap-2 rounded-2xl bg-brand-50 p-4 text-sm"><span>Tổng giá món: <strong>{formatMoney(estimatedOriginalPrice)}</strong></span><span>Giá combo sau giảm 10%: <strong className="text-brand-700">{formatMoney(Math.round(estimatedOriginalPrice * .9))}</strong></span></div>
          {save.isError && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{save.error.message}</p>}
          <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDialogOpen(false)} className="button-secondary">Hủy</button><button onClick={() => save.mutate({ id: editing?.id, data: form })} disabled={!canSave || save.isPending} className="button-primary"><Plus size={17} />{save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo combo'}</button></div>
        </section>
      </div>}
    </div>
  );
}
