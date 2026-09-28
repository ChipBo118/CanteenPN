'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell, Boxes, CalendarDays, ClipboardList, Clock3,
  GraduationCap, LayoutDashboard, LogOut,
  Ticket, Users,
  UtensilsCrossed, WalletCards,
} from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { ThemeToggle } from './theme-toggle';

// Khu vực quản lý căng tin tham chiếu cấu trúc điều hướng của CanteenGoo.
const ownerNav = [
  ['/admin', 'Tổng quan', LayoutDashboard],
  ['/admin/orders', 'Đơn hàng', ClipboardList],
  ['/admin/menu', 'Thực đơn', UtensilsCrossed],
  ['/admin/inventory', 'Kho hàng', Boxes],
  ['/admin/vouchers', 'Voucher', Ticket],
  ['/admin/finance', 'Tài chính', WalletCards],
  ['/admin/wallet', 'Ví điện tử', WalletCards],
  ['/admin/employees', 'Nhân viên', Users],
  ['/admin/shifts', 'Ca làm', CalendarDays],
  ['/admin/customers', 'Khách hàng', GraduationCap],
] as const;

const nav = {
  ADMIN: ownerNav,
  CASHIER: [
    ['/cashier/orders', 'Đơn hàng', ClipboardList],
    ['/cashier/menu', 'Thực đơn', UtensilsCrossed],
    ['/cashier/attendance', 'Chấm công', Clock3],
  ],
  KITCHEN_STAFF: [
    ['/kitchen/orders', 'Đơn bếp', ClipboardList],
    ['/kitchen/menu', 'Thực đơn', UtensilsCrossed],
    ['/kitchen/attendance', 'Chấm công', Clock3],
  ],
} as const;

export function PortalShell({ role, title, children }: {
  role: keyof typeof nav;
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const clear = useAuthStore((state) => state.clear);
  const user = useAuthStore((state) => state.user);
  const links = nav[role];
  const home = role === 'ADMIN' ? '/admin' : role === 'CASHIER' ? '/cashier/orders' : '/kitchen/orders';
  const logout = async () => {
    await apiRequest('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clear();
    router.push('/auth/login');
  };

  return (
    <div className="min-h-screen bg-[#f4f7f6] dark:bg-[#0d1513] lg:grid lg:grid-cols-[238px_minmax(0,1fr)]">
      <aside className="border-r bg-[color:var(--surface)] lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto">
        <Link href={home} className="flex h-[78px] items-center gap-3 border-b px-5">
          <span className="grid h-11 w-11 place-items-center rounded-[14px] bg-brand-600 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(8,127,91,.22)]">PN</span>
          <span>
            <b className="block text-lg font-extrabold tracking-[-.04em]">Canteen<span className="text-brand-600">PN</span></b>
            <small className="text-[9px] font-bold uppercase tracking-wider text-[color:var(--muted)]">Campus operations</small>
          </span>
        </Link>
        {role === 'ADMIN' && <p className="mx-4 mt-4 rounded-full bg-brand-50 px-3 py-1.5 text-center text-[10px] font-extrabold uppercase tracking-[.14em] text-brand-700 dark:bg-brand-900/30 dark:text-brand-100">Chủ căng tin</p>}
        <nav className="flex gap-2 overflow-x-auto p-3 lg:block lg:space-y-1 lg:overflow-visible" aria-label="Điều hướng nghiệp vụ">
          {links.map(([href, label, Icon]) => {
            const active = pathname === href || (href !== '/admin' && pathname.startsWith(`${href}/`));
            return (
              <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-bold transition ${active ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-100' : 'text-[color:var(--muted)] hover:bg-brand-50/70 hover:text-brand-700'}`}>
                <Icon size={18} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-[78px] items-center justify-between border-b bg-[color:var(--background)]/92 px-4 backdrop-blur-xl sm:px-8">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-brand-600">{role === 'ADMIN' ? 'Quản lý căng tin' : role === 'CASHIER' ? 'Quầy thu ngân' : 'Khu vực bếp'}</p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-[-.035em]">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button className="grid h-11 w-11 place-items-center rounded-[13px] border bg-[color:var(--surface)]" aria-label="Thông báo"><Bell size={18} /></button>
            <span className="hidden max-w-44 truncate rounded-[13px] border bg-[color:var(--surface)] px-3 py-2.5 text-xs font-bold sm:block">{user?.displayName}</span>
            <button onClick={logout} className="grid h-11 w-11 place-items-center rounded-[13px] bg-brand-600 text-white" aria-label="Đăng xuất"><LogOut size={18} /></button>
          </div>
        </header>
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}

