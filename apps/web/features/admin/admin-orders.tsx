'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Search, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { apiRequest, authHeaders, formatDateTime, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Order = {
  id: string;
  orderCode: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  createdAt: string;
  studentProfile: { studentDirectory: { fullName: string; studentCode: string } };
  items: { id: string; productNameSnapshot: string; quantity: number }[];
};

export function AdminOrders({ detailBase = '/admin/orders' }: { detailBase?: string }) {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const query = useQuery({ queryKey: ['admin-orders'], queryFn: () => apiRequest<Order[]>('/admin/orders', { headers: authHeaders(token) }), enabled: !!token });
  const cancel = useMutation({
    mutationFn: (id: string) => apiRequest(`/admin/orders/${id}/cancel`, { method: 'POST', headers: authHeaders(token), body: JSON.stringify({ reason: 'Quản trị viên hủy đơn sau khi xác minh' }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-orders'] }),
  });
  if (query.isLoading) return <LoadingState />;
  const rows = (query.data ?? []).filter((order) => (status === 'ALL' || order.status === status) && JSON.stringify(order).toLowerCase().includes(search.toLowerCase()));

  return <div className="space-y-5">
    <div><p className="eyebrow">Giám sát xuyên suốt</p><h2 className="mt-2 text-3xl font-black">Tất cả đơn hàng</h2></div>
    <div className="flex flex-col gap-3 lg:flex-row">
      <label className="relative flex-1"><Search size={17} className="absolute left-4 top-3.5"/><input className="field pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Mã đơn, sinh viên, món…"/></label>
      <select className="field max-w-xs" value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">Mọi trạng thái</option>{['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED', 'REJECTED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select>
    </div>
    {rows.length ? <div className="table-shell"><table className="data-table"><thead><tr><th>Mã đơn</th><th>Sinh viên</th><th>Món</th><th>Thanh toán</th><th>Trạng thái</th><th>Tổng</th><th/></tr></thead><tbody>{rows.map((order) => <tr key={order.id}>
      <td><Link href={`${detailBase}/${order.id}`} className="font-black text-brand-600">{order.orderCode}</Link><span className="block text-xs opacity-60">{formatDateTime(order.createdAt)}</span></td>
      <td>{order.studentProfile.studentDirectory.fullName}<span className="block text-xs opacity-60">{order.studentProfile.studentDirectory.studentCode}</span></td>
      <td>{order.items.slice(0, 2).map((item) => `${item.quantity}× ${item.productNameSnapshot}`).join(', ')}</td>
      <td><StatusBadge value={order.paymentStatus}/><span className="mt-1 block text-xs">{order.paymentMethod}</span></td>
      <td><StatusBadge value={order.status}/></td><td className="font-black">{formatMoney(order.totalAmount)}</td>
      <td><div className="flex gap-2"><Link href={`${detailBase}/${order.id}`} className="grid h-10 w-10 place-items-center rounded-full bg-brand-900 text-white"><ArrowRight size={17}/></Link>{!['COMPLETED', 'REJECTED', 'CANCELLED'].includes(order.status) && <button onClick={() => { if (window.confirm(`Hủy ${order.orderCode}? Hành động được ghi audit log.`)) cancel.mutate(order.id); }} className="grid h-10 w-10 place-items-center rounded-full border text-red-600" aria-label="Hủy đơn"><XCircle size={17}/></button>}</div></td>
    </tr>)}</tbody></table></div> : <EmptyState title="Không tìm thấy đơn phù hợp"/>}
  </div>;
}
