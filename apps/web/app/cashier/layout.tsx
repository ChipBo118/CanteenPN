'use client';
import { usePathname } from 'next/navigation';
import { PortalShell } from '@/components/portal-shell'; import { RequireSession } from '@/components/require-session';
export default function Layout({children}:{children:React.ReactNode}){const part=usePathname().split('/')[2];const title=part==='menu'?'Thực đơn':part==='attendance'?'Chấm công':'Đơn hàng';return <RequireSession roles={['CASHIER']}><PortalShell role="CASHIER" title={title}>{children}</PortalShell></RequireSession>}
