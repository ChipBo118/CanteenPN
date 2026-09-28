'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownLeft, ArrowUpRight, BarChart3, DollarSign, Download, Plus, Receipt, Save, TrendingUp, X } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { apiRequest, authHeaders, formatDateTime, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type FinanceTabId = 'stats' | 'transactions' | 'expenses' | 'export';
type Period = 'day' | 'week' | 'month' | 'year';
type Expense = { id: string; title: string; amount: number; category: string; note?: string; date: string };
type FinanceSettings = { expenses?: Expense[] };
type RevenueRow = { date: string; orders: number; revenue: number };
type Order = { id: string; orderCode: string; createdAt: string; paymentMethod: string; paymentStatus: string; status: string; totalAmount: number; studentProfile?: { studentDirectory?: { fullName?: string; studentCode?: string }; user?: { email?: string } } };

const tabs: { id: FinanceTabId; label: string; Icon: typeof TrendingUp }[] = [
  { id: 'stats', label: 'Thống kê', Icon: BarChart3 },
  { id: 'transactions', label: 'Giao dịch', Icon: Receipt },
  { id: 'expenses', label: 'Chi phí', Icon: DollarSign },
  { id: 'export', label: 'Xuất báo cáo', Icon: Download },
];
const periods: { id: Period; label: string }[] = [
  { id: 'day', label: 'Ngày' }, { id: 'week', label: 'Tuần' }, { id: 'month', label: 'Tháng' }, { id: 'year', label: 'Năm' },
];
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getPeriodRange(period: Period) {
  const end = new Date();
  const start = new Date(end);
  if (period === 'day') start.setHours(0, 0, 0, 0);
  if (period === 'week') { start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - ((start.getDay() + 6) % 7)); }
  if (period === 'month') { start.setHours(0, 0, 0, 0); start.setDate(1); }
  if (period === 'year') { start.setHours(0, 0, 0, 0); start.setMonth(0, 1); }
  return { from: dateKey(start), to: dateKey(end) };
}

function useRevenue(token: string | null | undefined, period: Period) {
  const range = useMemo(() => getPeriodRange(period), [period]);
  const query = useQuery({
    queryKey: ['owner-finance-revenue', period, range.from, range.to],
    queryFn: () => apiRequest<RevenueRow[]>(`/admin/reports/revenue?from=${range.from}&to=${range.to}`, { headers: authHeaders(token ?? undefined) }),
    enabled: !!token,
  });
  return { ...query, range, rows: query.data ?? [] };
}

function SettingsError({ message }: { message?: string }) {
  return message ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{message}</p> : null;
}

function errorMessage(error: unknown) {
  const message = error && typeof error === 'object' ? (error as { message?: unknown }).message : undefined;
  return typeof message === 'string' ? message : 'Không thể tải dữ liệu.';
}

function useFinanceSettings() {
  const token = useAuthStore((state) => state.accessToken);
  return useQuery({ queryKey: ['owner-finance-settings'], queryFn: () => apiRequest<FinanceSettings>('/admin/settings', { headers: authHeaders(token) }), enabled: !!token });
}

export function FinanceClient() {
  const [tab, setTab] = useState<FinanceTabId>('stats');
  return <div className="space-y-6">
    <div className="flex flex-wrap gap-2 rounded-2xl border bg-[color:var(--surface)] p-2" role="tablist" aria-label="Nghiệp vụ tài chính">
      {tabs.map(({ id, label, Icon }) => <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-bold transition ${tab === id ? 'bg-brand-600 text-white' : 'text-[color:var(--muted)] hover:bg-brand-50 hover:text-brand-700'}`}><Icon size={16}/>{label}</button>)}
    </div>
    {tab === 'transactions' && <TransactionsTab/>}
    {tab === 'expenses' && <ExpensesTab/>}
    {tab === 'stats' && <StatsTab/>}
    {tab === 'export' && <ExportTab/>}
  </div>;
}

function PeriodPicker({ period, onChange }: { period: Period; onChange: (value: Period) => void }) {
  return <div className="flex flex-wrap gap-2">{periods.map(item => <button key={item.id} type="button" onClick={() => onChange(item.id)} className={`rounded-full border px-4 py-2 text-sm font-bold ${period === item.id ? 'border-brand-600 bg-brand-600 text-white' : 'bg-[color:var(--surface)] text-[color:var(--muted)]'}`}>{item.label}</button>)}</div>;
}

function statusLabel(status: string) {
  return ({ PENDING: 'Chờ xác nhận', ACCEPTED: 'Đã tiếp nhận', PREPARING: 'Đang chuẩn bị', READY: 'Sẵn sàng', COMPLETED: 'Hoàn thành', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' } as Record<string, string>)[status] ?? status;
}

function TransactionsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const [filter, setFilter] = useState<'all' | 'paid' | 'cancelled'>('all');
  const query = useQuery({ queryKey: ['owner-finance-orders'], queryFn: () => apiRequest<Order[]>('/admin/orders', { headers: authHeaders(token) }), enabled: !!token });
  const rows = (query.data ?? []).filter(order => filter === 'paid' ? order.paymentStatus === 'PAID' : filter === 'cancelled' ? ['CANCELLED', 'REJECTED'].includes(order.status) : true);
  if (query.isLoading) return <LoadingState/>;
  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Đơn thanh toán và hủy</p><h2 className="mt-2 text-3xl font-black">Lịch sử giao dịch</h2></div><div className="flex gap-2">{[['all', 'Tất cả'], ['paid', 'Đã thanh toán'], ['cancelled', 'Đã hủy']] .map(([id, label]) => <button key={id} type="button" onClick={() => setFilter(id as typeof filter)} className={`rounded-full border px-4 py-2 text-sm font-bold ${filter === id ? 'border-brand-600 bg-brand-600 text-white' : 'bg-[color:var(--surface)] text-[color:var(--muted)]'}`}>{label}</button>)}</div></div>
    <SettingsError message={query.error ? errorMessage(query.error) : undefined}/>
    {rows.length ? <div className="table-shell overflow-x-auto"><table className="data-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày</th><th>Phương thức</th><th className="text-right">Số tiền</th><th>Trạng thái</th></tr></thead><tbody>{rows.map(order => <tr key={order.id}><td className="font-black">{order.orderCode}</td><td>{order.studentProfile?.studentDirectory?.fullName ?? order.studentProfile?.user?.email ?? 'Sinh viên'}</td><td>{formatDateTime(order.createdAt)}</td><td>{{ CASH: 'Tiền mặt', VNPAY_QR_MOCK: 'QR', CANTEEN_WALLET: 'Ví CanteenPN' }[order.paymentMethod] ?? order.paymentMethod}</td><td className="text-right font-bold">{formatMoney(order.totalAmount)}</td><td><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${order.paymentStatus === 'PAID' ? 'bg-brand-50 text-brand-700' : ['CANCELLED', 'REJECTED'].includes(order.status) ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{order.paymentStatus === 'PAID' ? 'Đã thanh toán' : statusLabel(order.status)}</span></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có giao dịch phù hợp"/>}
  </div>;
}

function ExpensesTab() {
  const token = useAuthStore((state) => state.accessToken);
  const client = useQueryClient();
  const settings = useFinanceSettings();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', category: 'Nguyên liệu', note: '' });
  const save = useMutation({ mutationFn: (expenses: Expense[]) => apiRequest('/admin/settings', { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify({ expenses }) }), onSuccess: () => client.invalidateQueries({ queryKey: ['owner-finance-settings'] }) });
  const expenses = Array.isArray(settings.data?.expenses) ? settings.data.expenses : [];
  const total = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const add = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isInteger(amount) || amount <= 0) return;
    const id = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    try {
      await save.mutateAsync([...expenses, { ...form, id, amount, date: new Date().toISOString() }]);
      setForm({ title: '', amount: '', category: 'Nguyên liệu', note: '' });
      setShowForm(false);
    } catch { /* The mutation error is shown above the form. */ }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Xóa khoản chi này?')) return;
    try { await save.mutateAsync(expenses.filter(item => item.id !== id)); } catch { /* The mutation error is shown above the table. */ }
  };
  if (settings.isLoading) return <LoadingState/>;
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-[1fr_auto]"><Metric label="Tổng chi phí" value={formatMoney(total)} Icon={DollarSign}/><div className="surface flex items-center justify-end rounded-3xl p-5"><button type="button" className="button-primary" onClick={() => setShowForm(value => !value)}><Plus size={17}/>{showForm ? 'Đóng' : 'Thêm chi phí'}</button></div></div>
    <SettingsError message={settings.error ? errorMessage(settings.error) : undefined}/><SettingsError message={save.error ? errorMessage(save.error) : undefined}/>
    {showForm && <form onSubmit={add} className="surface space-y-4 rounded-3xl p-6"><h3 className="text-lg font-black">Thêm khoản chi</h3><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Tên khoản chi<input className="field mt-2" required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder="VD: Nhập gạo 50kg"/></label><label className="text-sm font-bold">Số tiền<input className="field mt-2" type="number" min="1" step="1" required value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} placeholder="500000"/></label><label className="text-sm font-bold">Danh mục<select className="field mt-2" value={form.category} onChange={event => setForm({ ...form, category: event.target.value })}>{['Nguyên liệu', 'Nhập hàng', 'Vận hành', 'Lương', 'Khác'].map(value => <option key={value}>{value}</option>)}</select></label><label className="text-sm font-bold">Ghi chú<input className="field mt-2" value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} placeholder="Ghi chú thêm"/></label></div><button type="submit" className="button-primary" disabled={save.isPending}><Save size={16}/>{save.isPending ? 'Đang lưu…' : 'Lưu chi phí'}</button></form>}
    {expenses.length ? <div className="table-shell overflow-x-auto"><div className="border-b p-5"><h3 className="font-black">Danh sách chi phí ({expenses.length})</h3></div><table className="data-table"><thead><tr><th>Ngày</th><th>Khoản chi</th><th>Danh mục</th><th>Ghi chú</th><th className="text-right">Số tiền</th><th/></tr></thead><tbody>{[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map(item => <tr key={item.id}><td>{formatDateTime(item.date)}</td><td className="font-bold">{item.title}</td><td>{item.category}</td><td>{item.note || '—'}</td><td className="text-right font-bold text-red-600">−{formatMoney(item.amount)}</td><td><button type="button" className="button-secondary text-red-600" disabled={save.isPending} onClick={() => remove(item.id)}><X size={15}/>Xóa</button></td></tr>)}</tbody></table></div> : <EmptyState title="Chưa có khoản chi" detail="Thêm khoản chi để theo dõi chi phí và lợi nhuận."/>}
  </div>;
}

function StatsTab() {
  const token = useAuthStore((state) => state.accessToken);
  const [period, setPeriod] = useState<Period>('month');
  const revenue = useRevenue(token, period);
  const settings = useFinanceSettings();
  const expenses = (Array.isArray(settings.data?.expenses) ? settings.data.expenses : []).filter(item => { const key = dateKey(new Date(item.date)); return key >= revenue.range.from && key <= revenue.range.to; });
  const totalRevenue = revenue.rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalOrders = revenue.rows.reduce((sum, row) => sum + row.orders, 0);
  const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const profit = totalRevenue - totalExpenses;
  if (revenue.isLoading || settings.isLoading) return <LoadingState/>;
  return <div className="space-y-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Tổng hợp hoạt động</p><h2 className="mt-2 text-3xl font-black">Thống kê tài chính</h2><p className="mt-2 text-sm text-[color:var(--muted)]">{revenue.range.from} — {revenue.range.to}</p></div><PeriodPicker period={period} onChange={setPeriod}/></div>
    <SettingsError message={revenue.error ? errorMessage(revenue.error) : undefined}/><SettingsError message={settings.error ? errorMessage(settings.error) : undefined}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tổng doanh thu" value={formatMoney(totalRevenue)} Icon={TrendingUp}/><Metric label="Tổng chi phí" value={formatMoney(totalExpenses)} Icon={DollarSign}/><Metric label="Lợi nhuận" value={formatMoney(profit)} Icon={profit >= 0 ? ArrowUpRight : ArrowDownLeft} tone={profit >= 0 ? 'green' : 'red'}/><Metric label="Số đơn đã thanh toán" value={totalOrders.toLocaleString('vi-VN')} Icon={Receipt}/></div>
    <section className="surface rounded-3xl p-6"><h3 className="text-lg font-black">Doanh thu theo ngày</h3><div className="mt-4 h-72">{revenue.rows.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={revenue.rows}><defs><linearGradient id="ownerFinanceRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#008c68" stopOpacity={.32}/><stop offset="95%" stopColor="#008c68" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="date" tick={{ fontSize: 11 }}/><YAxis tickFormatter={value => `${Math.round(Number(value) / 1000)}k`} tick={{ fontSize: 11 }}/><Tooltip formatter={value => formatMoney(Number(value))}/><Area type="monotone" dataKey="revenue" stroke="#008c68" fill="url(#ownerFinanceRevenue)" strokeWidth={3}/></AreaChart></ResponsiveContainer> : <EmptyState title="Chưa có dữ liệu doanh thu"/>}</div></section>
    {revenue.rows.length ? <section className="table-shell overflow-x-auto"><div className="border-b p-5"><h3 className="font-black">Chi tiết doanh thu ({revenue.rows.length})</h3></div><table className="data-table"><thead><tr><th>Thời gian</th><th>Số đơn</th><th>Doanh thu</th></tr></thead><tbody>{revenue.rows.map(row => <tr key={row.date}><td>{row.date}</td><td>{row.orders}</td><td className="font-black text-brand-700">{formatMoney(row.revenue)}</td></tr>)}</tbody></table></section> : <EmptyState title="Chưa có dữ liệu doanh thu"/>}
  </div>;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function ExportTab() {
  const token = useAuthStore((state) => state.accessToken);
  const settings = useFinanceSettings();
  const [from, setFrom] = useState(dateKey(new Date(Date.now() - 30 * 86_400_000)));
  const [to, setTo] = useState(dateKey(new Date()));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const exportCsv = async () => {
    if (from > to) { setMessage('Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.'); return; }
    setBusy(true); setMessage('');
    try {
      const orders = await apiRequest<Order[]>(`/admin/reports/orders?from=${from}&to=${to}`, { headers: authHeaders(token) });
      const expenses = (Array.isArray(settings.data?.expenses) ? settings.data.expenses : []).filter(item => { const key = dateKey(new Date(item.date)); return key >= from && key <= to; });
      const rows: unknown[][] = [
        ['LOẠI', 'MÃ / KHOẢN', 'KHÁCH HÀNG', 'NGÀY', 'PHƯƠNG THỨC', 'TRẠNG THÁI', 'DANH MỤC / GHI CHÚ', 'SỐ TIỀN'],
        ...orders.map(order => ['Giao dịch', order.orderCode, order.studentProfile?.studentDirectory?.fullName ?? order.studentProfile?.user?.email ?? '', new Date(order.createdAt).toLocaleString('vi-VN'), order.paymentMethod, `${order.status} / ${order.paymentStatus}`, '', order.totalAmount]),
        ...expenses.map(item => ['Chi phí', item.title, '', new Date(item.date).toLocaleString('vi-VN'), '', '', `${item.category}${item.note ? ` — ${item.note}` : ''}`, -Number(item.amount)]),
        [], ['TỔNG DOANH THU', '', '', '', '', '', '', orders.filter(order => order.paymentStatus === 'PAID').reduce((sum, order) => sum + order.totalAmount, 0)],
        ['TỔNG CHI PHÍ', '', '', '', '', '', '', expenses.reduce((sum, item) => sum + Number(item.amount), 0)],
      ];
      const csv = `\uFEFF${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = `canteenpn-finance-${from}-to-${to}.csv`; anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Đã xuất báo cáo tài chính.');
    } catch (error) { setMessage(errorMessage(error)); }
    finally { setBusy(false); }
  };
  return <section className="surface max-w-3xl space-y-5 rounded-3xl p-6"><div><p className="eyebrow">CSV</p><h2 className="mt-2 text-2xl font-black">Xuất báo cáo tài chính</h2><p className="mt-2 text-sm text-[color:var(--muted)]">Báo cáo gồm giao dịch đơn hàng và khoản chi trong khoảng thời gian đã chọn.</p></div><SettingsError message={settings.error ? errorMessage(settings.error) : undefined}/><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Từ ngày<input className="field mt-2" type="date" value={from} onChange={event => setFrom(event.target.value)}/></label><label className="text-sm font-bold">Đến ngày<input className="field mt-2" type="date" value={to} onChange={event => setTo(event.target.value)}/></label></div><button type="button" className="button-primary" onClick={exportCsv} disabled={busy || settings.isLoading}><Download size={16}/>{busy ? 'Đang xuất…' : 'Tải xuống CSV'}</button>{message && <p role="status" className="text-sm font-semibold text-[color:var(--muted)]">{message}</p>}</section>;
}

function Metric({ label, value, Icon, tone = 'brand' }: { label: string; value: string; Icon: typeof TrendingUp; tone?: 'brand' | 'green' | 'red' | 'amber' }) {
  const colors = { brand: 'bg-brand-50 text-brand-700 dark:bg-brand-900/30', green: 'bg-emerald-50 text-emerald-700', red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700' };
  return <article className="surface rounded-3xl p-5"><span className={`grid h-11 w-11 place-items-center rounded-2xl ${colors[tone]}`}><Icon size={21}/></span><p className="mt-4 text-sm text-[color:var(--muted)]">{label}</p><p className="mt-1 text-2xl font-black">{value}</p></article>;
}
