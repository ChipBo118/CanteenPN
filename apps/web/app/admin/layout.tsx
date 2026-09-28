'use client';

import { usePathname } from 'next/navigation';
import { PortalShell } from '@/components/portal-shell';
import { RequireSession } from '@/components/require-session';

const titles: Record<string, string> = {
  orders: 'Đơn hàng',
  menu: 'Quản lý thực đơn',
  inventory: 'Kho hàng',
  vouchers: 'Voucher',
  finance: 'Tài chính',
  wallet: 'Ví điện tử',
  reports: 'Báo cáo',
  employees: 'Quản lý nhân viên',
  shifts: 'Ca làm',
  customers: 'Quản lý khách hàng',
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  const section = usePathname().split('/')[2] ?? '';
  return (
    <RequireSession roles={['ADMIN']}>
      <PortalShell role="ADMIN" title={titles[section] ?? 'Tổng quan'}>{children}</PortalShell>
    </RequireSession>
  );
}
