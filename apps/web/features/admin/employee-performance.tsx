'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChefHat, Clock3, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { apiRequest, authHeaders } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const ask = (label: string, initial = '') => window.prompt(label, initial)?.trim();

export function EmployeePerformance() {
  const token = useAuthStore(state => state.accessToken);
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['employee-performance'],
    queryFn: () => apiRequest<any[]>('/admin/employee-performance', { headers: authHeaders(token) }),
    enabled: !!token,
  });
  const create = useMutation({
    mutationFn: ({ url = '/admin/employees', method = 'POST', body }: { url?: string; method?: string; body?: unknown }) => apiRequest(url, { method, headers: authHeaders(token), body: body === undefined ? undefined : JSON.stringify(body) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee-performance'] }); queryClient.invalidateQueries({ queryKey: ['admin-employees-select'] }); },
  });

  function add() {
    const employeeCode = ask('Mã nhân viên');
    const fullName = ask('Họ tên');
    const email = ask('Email đăng nhập');
    const workRole = ask('Vai trò: CASHIER hoặc KITCHEN_STAFF', 'CASHIER');
    const hireDate = ask('Ngày vào làm YYYY-MM-DD', new Date().toISOString().slice(0, 10));
    const password = ask('Mật khẩu ban đầu (ít nhất 8 ký tự)', 'CanteenGo@123');
    if (!employeeCode || !fullName || !email || !workRole || !hireDate || !password) return;
    create.mutate({ body: { employeeCode, fullName, email, workRole, hireDate: new Date(`${hireDate}T00:00:00+07:00`).toISOString(), password, phone: ask('Số điện thoại') || undefined } });
  }
  function edit(employee: any) {
    const employeeCode = ask('Mã nhân viên', employee.employeeCode); const fullName = ask('Họ tên', employee.fullName); const email = ask('Email đăng nhập', employee.email); const phone = ask('Số điện thoại', employee.phone ?? ''); const workRole = ask('Vai trò: CASHIER hoặc KITCHEN_STAFF', employee.workRole); const hireDate = ask('Ngày vào làm YYYY-MM-DD', String(employee.hireDate).slice(0, 10));
    if (!employeeCode || !fullName || !email || !workRole || !hireDate) return;
    const password = ask('Mật khẩu mới (để trống nếu giữ nguyên)');
    create.mutate({ url: `/admin/employees/${employee.id}`, method: 'PATCH', body: { employeeCode, fullName, email, phone: phone || undefined, workRole, hireDate: new Date(`${hireDate}T00:00:00+07:00`).toISOString(), ...(password ? { password } : {}) } });
  }
  function remove(employee: any) { if (window.confirm(`Xóa nhân viên “${employee.fullName}”? Các ca chưa làm sẽ bị hủy.`)) create.mutate({ url: `/admin/employees/${employee.id}`, method: 'DELETE' }); }

  if (query.isLoading || !query.data) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Hiệu suất minh bạch</p><h2 className="mt-2 text-3xl font-black">Nhân viên</h2></div>
        <button onClick={add} className="button-primary"><Plus size={17} />Thêm nhân viên</button>
      </div>
      {create.isError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{(create.error as Error).message}</p>}
      {query.data.length ? (
        <section className="surface overflow-hidden rounded-3xl">
          <div className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-[color:var(--muted)] dark:border-white/10">{query.data.length} nhân viên</div>
          <div className="divide-y divide-slate-100 dark:divide-white/10">
            {query.data.map(employee => {
              const metrics = employee.workRole === 'CASHIER'
                ? [
                    { icon: ReceiptText, label: 'Nhận / từ chối', value: `${employee.acceptedOrders} / ${employee.rejectedOrders}` },
                    { icon: Clock3, label: 'Xử lý trung bình', value: `${employee.averageHandlingMinutes} phút` },
                    { icon: ReceiptText, label: 'Đã giao', value: `${employee.completedHandoffs}` },
                  ]
                : [
                    { icon: ChefHat, label: 'Đã nhận món', value: `${employee.claimedItems}` },
                    { icon: Clock3, label: 'Chế biến trung bình', value: `${employee.averagePreparationMinutes} phút` },
                    { icon: ChefHat, label: 'Hoàn tất', value: `${employee.completedItems}` },
                  ];
              return (
                <article key={employee.id} className="flex flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center">
                  <div className="flex min-w-0 items-center gap-4 lg:w-72 lg:shrink-0">
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-100 font-black text-brand-800 dark:bg-brand-900/40 dark:text-brand-100">{employee.fullName?.slice(0, 2).toUpperCase()}</span>
                    <div className="min-w-0"><h3 className="truncate font-black">{employee.fullName}</h3><p className="mt-1 truncate text-sm text-[color:var(--muted)]">{employee.employeeCode} · {employee.email}</p></div>
                    <StatusBadge value={employee.workRole === 'CASHIER' ? 'Thu ngân' : employee.workRole === 'KITCHEN_STAFF' ? 'Nhân viên bếp' : employee.workRole} />
                  </div>
                  <dl className="grid flex-1 gap-2 sm:grid-cols-3 lg:pl-4">
                    {metrics.map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-3 rounded-xl bg-brand-50/70 px-3 py-2 dark:bg-brand-900/20"><Icon size={17} className="shrink-0 text-brand-700 dark:text-brand-200" /><div className="min-w-0"><dt className="truncate text-xs text-[color:var(--muted)]">{label}</dt><dd className="mt-0.5 font-black">{value}</dd></div></div>)}
                  </dl>
                  <div className="flex shrink-0 gap-2"><button onClick={() => edit(employee)} className="button-secondary" aria-label="Sửa nhân viên"><Pencil size={16}/>Sửa</button><button onClick={() => remove(employee)} className="button-secondary text-red-600" aria-label="Xóa nhân viên"><Trash2 size={16}/>Xóa</button></div>
                </article>
              );
            })}
          </div>
        </section>
      ) : <EmptyState title="Chưa có nhân viên" detail="Nhân viên mới sẽ xuất hiện tại đây sau khi được thêm." />}
    </div>
  );
}
