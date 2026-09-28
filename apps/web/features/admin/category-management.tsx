'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderPlus, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { apiRequest, authHeaders } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Category = { id: string; name: string; slug: string; icon: string; sortOrder: number; isActive: boolean; _count: { products: number } };
type CategoryForm = { name: string; slug: string; icon: string; sortOrder: number };
const blankForm: CategoryForm = { name: '', slug: '', icon: '🍽️', sortOrder: 0 };

function makeSlug(value: string, existing: string[] = []) {
  const base = value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'danh-muc';
  const used = new Set(existing);
  let slug = base;
  let suffix = 2;
  while (used.has(slug)) slug = `${base}-${suffix++}`;
  return slug;
}

export function CategoryManagement() {
  const token = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CategoryForm>(blankForm);
  const [editing, setEditing] = useState<Category | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState('');
  const categories = useQuery({ queryKey: ['categories-crud'], queryFn: () => apiRequest<Category[]>('/admin/categories', { headers: authHeaders(token) }), enabled: !!token });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['categories-crud'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
  };

  const save = useMutation({
    mutationFn: () => apiRequest<Category>(editing ? `/admin/categories/${editing.id}` : '/admin/categories', {
      method: editing ? 'PATCH' : 'POST',
      headers: authHeaders(token),
      body: JSON.stringify(form),
    }),
    onSuccess: () => {
      setDialogOpen(false);
      setEditing(null);
      setForm(blankForm);
      setMessage(editing ? 'Đã cập nhật danh mục.' : 'Đã thêm danh mục.');
      refresh();
    },
    onError: (error: Error) => setMessage(error.message || 'Không thể lưu danh mục.'),
  });

  const update = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CategoryForm> & { isActive?: boolean } }) => apiRequest(`/admin/categories/${id}`, {
      method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(data),
    }),
    onSuccess: refresh,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE', headers: authHeaders(token) }),
    onSuccess: () => { setMessage('Đã xóa danh mục.'); refresh(); },
    onError: (error: Error) => setMessage(error.message || 'Không thể xóa danh mục.'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm);
    setMessage('');
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({ name: category.name, slug: category.slug, icon: category.icon || '🍽️', sortOrder: category.sortOrder });
    setMessage('');
    setDialogOpen(true);
  };

  if (categories.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">Cấu trúc thực đơn</p><h2 className="mt-2 text-3xl font-black">Danh mục</h2></div>
        <button onClick={openCreate} className="button-primary"><FolderPlus size={17} />Thêm danh mục</button>
      </div>
      {message && <p role="status" className="rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">{message}</p>}
      <div className="table-shell">
        <table className="data-table">
          <thead><tr><th>Danh mục</th><th>Sản phẩm</th><th>Thứ tự</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>
            {categories.data?.map(category => (
              <tr key={category.id}>
                <td><span className="mr-2 text-xl">{category.icon || '🍽️'}</span><strong>{category.name}</strong></td>
                <td>{category._count.products}</td>
                <td className="font-bold">{category.sortOrder}</td>
                <td><button onClick={() => update.mutate({ id: category.id, data: { isActive: !category.isActive } })} aria-label={`${category.isActive ? 'Ẩn' : 'Hiện'} ${category.name}`}><StatusBadge value={category.isActive ? 'ACTIVE' : 'INACTIVE'} /></button></td>
                <td><div className="flex gap-2">
                  <button onClick={() => openEdit(category)} className="grid h-10 w-10 place-items-center rounded-full border" aria-label={`Sửa ${category.name}`}><Pencil size={16} /></button>
                  <button onClick={() => { if (window.confirm(`Xóa danh mục ${category.name}?`)) remove.mutate(category.id); }} disabled={category._count.products > 0 || remove.isPending} title={category._count.products ? 'Chỉ xóa được danh mục chưa có sản phẩm' : 'Xóa danh mục'} className="grid h-10 w-10 place-items-center rounded-full border text-red-600 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Xóa ${category.name}`}><Trash2 size={16} /></button>
                </div></td>
              </tr>
            ))}
            {!categories.data?.length && <tr><td colSpan={5} className="py-12 text-center text-[color:var(--muted)]">Chưa có danh mục nào.</td></tr>}
          </tbody>
        </table>
      </div>

      {dialogOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setDialogOpen(false); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="category-dialog-title" className="surface w-full max-w-xl rounded-3xl p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><p className="eyebrow">Thực đơn</p><h3 id="category-dialog-title" className="mt-2 text-2xl font-black">{editing ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3></div><button onClick={() => setDialogOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border" aria-label="Đóng"><X size={18} /></button></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-[100px_1fr]"><label><span className="mb-2 block text-sm font-bold">Biểu tượng</span><input className="field text-center text-2xl" maxLength={4} value={form.icon} onChange={event => setForm({ ...form, icon: event.target.value })} /></label><label><span className="mb-2 block text-sm font-bold">Tên danh mục</span><input className="field" autoFocus value={form.name} onChange={event => { const name = event.target.value; const otherSlugs = categories.data?.filter(category => category.id !== editing?.id).map(category => category.slug) ?? []; setForm(current => ({ ...current, name, slug: makeSlug(name, otherSlugs) })); }} placeholder="Ví dụ: Đồ uống" /></label></div>
          <label className="mt-4 block"><span className="mb-2 block text-sm font-bold">Thứ tự hiển thị</span><input className="field" type="number" value={form.sortOrder} onChange={event => setForm({ ...form, sortOrder: Number(event.target.value) })} /></label>
          {save.isError && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{save.error.message}</p>}
          <div className="mt-6 flex justify-end gap-3"><button onClick={() => setDialogOpen(false)} className="button-secondary">Hủy</button><button onClick={() => save.mutate()} disabled={!form.name.trim() || !form.slug.trim() || save.isPending} className="button-primary"><Plus size={17} />{save.isPending ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm danh mục'}</button></div>
        </section>
      </div>}
    </div>
  );
}
