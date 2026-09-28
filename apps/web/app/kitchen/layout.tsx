'use client';
import { usePathname } from 'next/navigation'; import { PortalShell } from '@/components/portal-shell'; import { RequireSession } from '@/components/require-session';
export default function Layout({children}:{children:React.ReactNode}){const part=usePathname().split('/')[2];const title=part==='menu'?'Thực đơn':part==='attendance'?'Chấm công':'Đơn bếp';return <RequireSession roles={['KITCHEN_STAFF']}><PortalShell role="KITCHEN_STAFF" title={title}>{children}</PortalShell></RequireSession>}
