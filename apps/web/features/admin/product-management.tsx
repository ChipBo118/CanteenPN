'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, RefreshCw, Save, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { API_URL, apiRequest, authHeaders, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { productStockLabel } from '@/lib/product-stock';

type Category = { id: string; name: string; slug: string; isActive: boolean };
type Ingredient = { id: string; name: string; unit: string };
type Product = {
  id: string; categoryId: string; category: { name: string }; name: string; slug: string; description: string;
  basePrice: number; imageUrl?: string; preparationTimeMinutes: number; isVegetarian: boolean; isAvailable: boolean;
  deletedAt?: string; variants: { id: string; name: string; sku: string; priceAdjustment: number; active: boolean }[];
  recipes: { id: string; name: string; ingredients: { ingredient: { id: string; name: string; unit: string; currentQuantity: string; reservedQuantity: string }; quantity: string }[] }[];
};
type ProductForm = { categoryId: string; name: string; slug: string; description: string; basePrice: number; imageUrl: string; preparationTimeMinutes: number; isVegetarian: boolean; isAvailable: boolean };
const blankProduct = (): ProductForm => ({ categoryId: '', name: '', slug: '', description: '', basePrice: 30000, imageUrl: '/images/com-tam.jpg', preparationTimeMinutes: 10, isVegetarian: false, isAvailable: true });

function slugify(name: string, existing: string[] = []) {
  const base = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mon-an';
  const used = new Set(existing);
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

export function ProductManagement() {
  const token = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductForm>(blankProduct());
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Product>();
  const [selected, setSelected] = useState<string>();
  const [variant, setVariant] = useState({ name: '', sku: '', priceAdjustment: 0 });
  const [option, setOption] = useState({ name: '', slug: '', values: 'Tiêu chuẩn' });
  const [recipeName, setRecipeName] = useState('Công thức tiêu chuẩn');
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; quantity: number }[]>([]);
  const [message, setMessage] = useState('');

  const products = useQuery({ queryKey: ['admin-products-crud'], queryFn: () => apiRequest<Product[]>('/admin/products', { headers: authHeaders(token) }), enabled: !!token });
  const categories = useQuery({ queryKey: ['admin-categories'], queryFn: () => apiRequest<Category[]>('/admin/categories', { headers: authHeaders(token) }), enabled: !!token });
  const ingredients = useQuery({ queryKey: ['admin-ingredients'], queryFn: () => apiRequest<Ingredient[]>('/admin/ingredients', { headers: authHeaders(token) }), enabled: !!token });
  const current = useMemo(() => products.data?.find(product => product.id === selected), [products.data, selected]);
  const refresh = () => { void queryClient.invalidateQueries({ queryKey: ['admin-products-crud'] }); };

  const uploadImage = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append('image', file);
      const response = await fetch(`${API_URL}/admin/products/image`, { method: 'POST', credentials: 'include', headers: authHeaders(token), body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message || 'Không thể tải ảnh lên.');
      return result as { imageUrl: string };
    },
    onSuccess: result => { setForm(currentForm => ({ ...currentForm, imageUrl: result.imageUrl })); setMessage('Ảnh đã được tải lên.'); },
    onError: (error: Error) => setMessage(error.message),
  });

  const create = useMutation({
    mutationFn: () => apiRequest('/admin/products', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(form) }),
    onSuccess: () => { setCreateOpen(false); setForm(blankProduct()); setMessage('Đã tạo sản phẩm.'); refresh(); },
    onError: (error: Error) => setMessage(error.message),
  });
  const patch = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => apiRequest(`/admin/products/${id}`, { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data) }),
    onSuccess: () => { setCreateOpen(false); setEditing(undefined); setMessage('Đã cập nhật sản phẩm.'); refresh(); },
    onError: (error: Error) => setMessage(error.message),
  });
  const remove = useMutation({ mutationFn: (id: string) => apiRequest(`/admin/products/${id}`, { method: 'DELETE', headers: authHeaders(token) }), onSuccess: refresh });
  const addVariant = useMutation({ mutationFn: () => apiRequest(`/admin/products/${selected}/variants`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify(variant) }), onSuccess: () => { setVariant({ name: '', sku: '', priceAdjustment: 0 }); refresh(); } });
  const addOption = useMutation({
    mutationFn: async () => {
      const group = await apiRequest<{ id: string }>('/admin/option-groups', { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ name: option.name, slug: option.slug, minSelect: 0, maxSelect: 1, values: option.values.split(',').map((name, index) => ({ name: name.trim(), sortOrder: index })) }) });
      return apiRequest(`/admin/products/${selected}/option-groups`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ optionGroupId: group.id }) });
    },
    onSuccess: () => { setOption({ name: '', slug: '', values: 'Tiêu chuẩn' }); refresh(); },
  });
  const saveRecipe = useMutation({ mutationFn: () => apiRequest(`/admin/products/${selected}/recipe`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ name: recipeName, ingredients: recipeLines }) }), onSuccess: () => { setMessage('Đã lưu công thức và định lượng.'); refresh(); } });

  if (products.isLoading || categories.isLoading || ingredients.isLoading) return <LoadingState />;

  const openCreate = () => { setEditing(undefined); setForm(blankProduct()); setMessage(''); setCreateOpen(true); };
  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      categoryId: product.categoryId,
      name: product.name,
      slug: product.slug,
      description: product.description,
      basePrice: product.basePrice,
      imageUrl: product.imageUrl ?? '/images/com-tam.jpg',
      preparationTimeMinutes: product.preparationTimeMinutes,
      isVegetarian: product.isVegetarian,
      isAvailable: product.isAvailable,
    });
    setMessage('');
    setCreateOpen(true);
  };
  const setProductName = (name: string) => {
    const otherSlugs = products.data?.filter(product => product.id !== editing?.id).map(product => product.slug) ?? [];
    setForm(currentForm => ({ ...currentForm, name, slug: slugify(name, otherSlugs) }));
  };
  const uploadSelectedImage = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setMessage('Chỉ chấp nhận ảnh JPG, PNG hoặc WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setMessage('Ảnh phải nhỏ hơn 5 MB.'); return; }
    setMessage('Đang tải ảnh lên…');
    uploadImage.mutate(file);
  };

  return <div className="space-y-7">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Catalog đầy đủ</p><h2 className="mt-2 text-3xl font-black">Sản phẩm</h2></div><button onClick={openCreate} className="button-primary"><Plus size={17} />Thêm sản phẩm</button></div>
    {message && !createOpen && <p role="status" className="rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">{message}</p>}
    {products.data?.length ? <div className="table-shell"><table className="data-table"><thead><tr><th>Món</th><th>Giá</th><th>Trạng thái</th><th>Tồn món</th><th>Biến thể</th><th>Công thức</th><th /></tr></thead><tbody>{products.data.map(product => <tr key={product.id} className={selected === product.id ? 'bg-brand-50/50' : ''}>
      <td><button onClick={() => { setSelected(product.id); setRecipeLines(product.recipes[0]?.ingredients.map(line => ({ ingredientId: line.ingredient.id, quantity: Number(line.quantity) })) ?? []); setRecipeName(product.recipes[0]?.name ?? 'Công thức tiêu chuẩn'); }} className="text-left font-black text-brand-600">{product.name}</button><span className="block text-xs text-[color:var(--muted)]">{product.category.name}</span></td>
      <td className="font-bold">{formatMoney(product.basePrice)}</td>
      <td><StatusBadge value={product.isAvailable ? 'ACTIVE' : 'INACTIVE'} /></td><td className="font-bold">{productStockLabel(product.recipes)}</td><td>{product.variants.length}</td><td>{product.recipes.length ? 'Đã định lượng' : 'Chưa có'}</td>
      <td><div className="flex gap-2"><button onClick={() => openEdit(product)} className="grid h-10 w-10 place-items-center rounded-full border" aria-label={`Sửa ${product.name}`} title="Sửa món"><Pencil size={16} /></button><button onClick={() => { if (window.confirm(`Ngừng bán ${product.name}?`)) remove.mutate(product.id); }} className="grid h-10 w-10 place-items-center rounded-full border text-red-600" aria-label={`Ngừng bán ${product.name}`}><Trash2 size={16} /></button></div></td>
    </tr>)}</tbody></table></div> : <EmptyState title="Chưa có sản phẩm" />}

    {current && <section className="surface rounded-3xl p-6"><div className="flex items-center justify-between"><div><p className="eyebrow">Cấu hình nâng cao</p><h3 className="mt-2 text-2xl font-black">{current.name}</h3></div><button className="button-secondary" onClick={refresh}><RefreshCw size={17} />Làm mới</button></div><div className="mt-6 grid gap-6 xl:grid-cols-3">
      <div className="rounded-3xl border p-5"><h4 className="font-black">Biến thể</h4><div className="mt-3 space-y-2">{current.variants.map(item => <p key={item.id} className="rounded-xl bg-brand-50 p-2 text-sm">{item.name} · {formatMoney(item.priceAdjustment)}</p>)}</div><input className="field mt-3" placeholder="Tên: L" value={variant.name} onChange={event => setVariant({ ...variant, name: event.target.value })} /><input className="field mt-2" placeholder="SKU duy nhất" value={variant.sku} onChange={event => setVariant({ ...variant, sku: event.target.value })} /><input className="field mt-2" type="number" placeholder="Phụ thu" value={variant.priceAdjustment} onChange={event => setVariant({ ...variant, priceAdjustment: Number(event.target.value) })} /><button className="button-primary mt-3 w-full" disabled={!variant.name || !variant.sku} onClick={() => addVariant.mutate()}><Plus size={16} />Thêm biến thể</button></div>
      <div className="rounded-3xl border p-5"><h4 className="font-black">Nhóm tùy chọn</h4><input className="field mt-3" placeholder="Tên nhóm" value={option.name} onChange={event => setOption({ ...option, name: event.target.value })} /><input className="field mt-2" placeholder="slug" value={option.slug} onChange={event => setOption({ ...option, slug: event.target.value })} /><input className="field mt-2" placeholder="Giá trị cách nhau bằng dấu phẩy" value={option.values} onChange={event => setOption({ ...option, values: event.target.value })} /><button className="button-primary mt-3 w-full" disabled={!option.name || !option.slug} onClick={() => addOption.mutate()}><Plus size={16} />Tạo và gắn tùy chọn</button></div>
      <div className="rounded-3xl border p-5"><h4 className="font-black">Công thức nguyên liệu</h4><input className="field mt-3" value={recipeName} onChange={event => setRecipeName(event.target.value)} /><div className="mt-3 max-h-52 space-y-2 overflow-auto">{ingredients.data?.map(ingredient => { const line = recipeLines.find(item => item.ingredientId === ingredient.id); return <div key={ingredient.id} className="flex items-center gap-2"><label className="flex-1 text-sm"><input type="checkbox" checked={!!line} onChange={event => setRecipeLines(items => event.target.checked ? [...items, { ingredientId: ingredient.id, quantity: .1 }] : items.filter(item => item.ingredientId !== ingredient.id))} /> {ingredient.name}</label>{line && <input className="field w-24" type="number" step="0.001" value={line.quantity} onChange={event => setRecipeLines(items => items.map(item => item.ingredientId === ingredient.id ? { ...item, quantity: Number(event.target.value) } : item))} />}<span className="w-10 text-xs">{ingredient.unit}</span></div>; })}</div><button className="button-primary mt-3 w-full" disabled={!recipeLines.length} onClick={() => saveRecipe.mutate()}><Save size={16} />Lưu công thức</button></div>
    </div></section>}

    {createOpen && <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget && !uploadImage.isPending && !create.isPending && !patch.isPending) setCreateOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="product-dialog-title" className="surface my-auto w-full max-w-3xl rounded-3xl p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Thực đơn</p><h3 id="product-dialog-title" className="mt-2 text-2xl font-black">{editing ? 'Sửa món ăn' : 'Thêm sản phẩm'}</h3></div><button className="grid h-10 w-10 place-items-center rounded-full border" onClick={() => setCreateOpen(false)} disabled={uploadImage.isPending || create.isPending || patch.isPending} aria-label="Đóng"><X size={18} /></button></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2"><Field label="Tên món"><input className="field" autoFocus value={form.name} onChange={event => setProductName(event.target.value)} placeholder="Ví dụ: Cơm tấm sườn" /></Field><Field label="Danh mục"><select className="field" value={form.categoryId} onChange={event => setForm({ ...form, categoryId: event.target.value })}><option value="">Chọn danh mục</option>{categories.data?.filter(category => category.isActive).map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field><Field label="Giá bán"><input className="field" type="number" min={0} value={form.basePrice} onChange={event => setForm({ ...form, basePrice: Number(event.target.value) })} /></Field><Field label="Thời gian chuẩn bị (phút)"><input className="field" type="number" min={1} value={form.preparationTimeMinutes} onChange={event => setForm({ ...form, preparationTimeMinutes: Number(event.target.value) })} /></Field><Field label="Mô tả"><input className="field" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} /></Field><div className="flex flex-wrap items-center gap-5 pb-3 pt-3"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.isVegetarian} onChange={event => setForm({ ...form, isVegetarian: event.target.checked })} />Món chay</label><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={form.isAvailable} onChange={event => setForm({ ...form, isAvailable: event.target.checked })} />Đang phục vụ</label></div>
          <div className="sm:col-span-2"><span className="mb-2 block text-sm font-bold">Ảnh món</span><div className="flex flex-wrap items-center gap-4"><div className="h-28 w-36 overflow-hidden rounded-2xl border bg-brand-50"><img src={form.imageUrl || '/images/com-tam.jpg'} alt="Xem trước món" className="h-full w-full object-cover" /></div><label className="button-secondary cursor-pointer"><ImagePlus size={17} />{uploadImage.isPending ? 'Đang tải ảnh…' : 'Chọn ảnh từ máy'}<input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={uploadImage.isPending} onChange={event => { uploadSelectedImage(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></div></div>
        </div>
        {uploadImage.isError && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{uploadImage.error.message}</p>}{(create.isError || patch.isError) && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{message}</p>}
        <div className="mt-6 flex justify-end gap-3"><button className="button-secondary" onClick={() => setCreateOpen(false)} disabled={uploadImage.isPending || create.isPending || patch.isPending}>Hủy</button><button className="button-primary" disabled={!form.name.trim() || !form.categoryId || !form.description.trim() || uploadImage.isPending || create.isPending || patch.isPending} onClick={() => editing ? patch.mutate({ id: editing.id, data: form }) : create.mutate()}>{editing ? <Save size={17} /> : <Plus size={17} />}{create.isPending || patch.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Tạo sản phẩm'}</button></div>
      </section>
    </div>}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="mb-2 block text-sm font-bold">{label}</span>{children}</label>;
}
