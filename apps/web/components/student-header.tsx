'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, Heart, Home, LogOut, ReceiptText, ShoppingBag, UserRound, WalletCards } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { useAuthStore } from '@/lib/auth-store';
import { apiRequest } from '@/lib/api';

const links=[['/menu','Thực đơn'],['/orders','Đơn của tôi'],['/wallet','Ví CanteenPN'],['/coupons','Ưu đãi'],['/favorites','Yêu thích']] as const;
const mobile=[['/', 'Trang chủ',Home],['/menu','Thực đơn',ShoppingBag],['/orders','Đơn hàng',ReceiptText],['/wallet','Ví',WalletCards],['/favorites','Yêu thích',Heart],['/profile','Tôi',UserRound]] as const;

export function Brand(){return <Link href="/" className="flex shrink-0 items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-[14px] bg-brand-600 text-sm font-extrabold tracking-tight text-white shadow-[0_8px_20px_rgba(8,127,91,.22)]">PN</span><span className="leading-none"><span className="block text-xl font-extrabold tracking-[-.04em] text-brand-900 dark:text-white">Canteen<span className="text-brand-600">PN</span></span><small className="mt-1.5 block text-[9px] font-bold uppercase tracking-[.08em] text-[color:var(--muted)]">Ăn ngon · Học tốt</small></span></Link>}

export function StudentHeader() {
  const pathname=usePathname(); const user=useAuthStore(state=>state.user); const clear=useAuthStore(state=>state.clear); const router=useRouter();
  const logout=async()=>{await apiRequest('/auth/logout',{method:'POST'}).catch(()=>undefined);clear();router.push('/auth/login')};
  const active=(href:string)=>pathname===href||pathname.startsWith(`${href}/`);
  return <>
    <header className="sticky top-0 z-40 border-b bg-[color:var(--background)]/95 backdrop-blur-2xl">
      <div className="container-shell flex h-[78px] items-center justify-between gap-6"><Brand/>
        <nav className="hidden h-full items-center gap-4 text-xs font-semibold md:flex lg:gap-6 xl:gap-9 xl:text-sm" aria-label="Điều hướng chính">{links.map(([href,label])=><Link key={href} href={href} className={`relative flex h-full items-center whitespace-nowrap transition ${active(href)?'text-brand-600':'text-[color:var(--muted)] hover:text-brand-600'}`}>{label}{active(href)&&<span className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-brand-600"/>}</Link>)}</nav>
        <div className="flex items-center gap-2"><ThemeToggle/><Link href="/notifications" className="relative grid h-11 w-11 place-items-center rounded-[13px] border bg-[color:var(--surface)]" aria-label="Thông báo"><Bell size={19}/><span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border-2 border-[color:var(--background)] bg-red-500"/></Link><Link href="/cart" className="flex h-11 items-center gap-2 rounded-[13px] bg-brand-600 px-3.5 font-bold text-white shadow-[0_8px_20px_rgba(8,127,91,.18)]" aria-label="Giỏ hàng"><ShoppingBag size={18}/><span className="hidden lg:inline">Giỏ hàng</span></Link>{user?<><Link href="/profile" className="hidden items-center gap-3 rounded-[13px] border bg-[color:var(--surface)] px-3 py-2 lg:flex"><span className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand-50 text-brand-700"><UserRound size={17}/></span><span className="max-w-40 truncate text-xs font-bold">{user.displayName}</span></Link><button onClick={logout} className="hidden h-11 w-11 place-items-center rounded-[13px] border bg-[color:var(--surface)] sm:grid" aria-label="Đăng xuất"><LogOut size={18}/></button></>:<Link href="/auth/login" className="button-secondary hidden sm:inline-flex">Đăng nhập</Link>}</div>
      </div>
    </header>
    <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[66px] items-center justify-around border-t bg-[color:var(--surface)]/95 px-2 pb-1 backdrop-blur-xl md:hidden" aria-label="Điều hướng di động">{mobile.map(([href,label,Icon])=><Link key={href} href={href} className={`flex min-w-14 flex-col items-center gap-1 text-[9px] font-semibold ${active(href)?'text-brand-600':'text-[color:var(--muted)]'}`}><Icon size={20}/><span>{label}</span></Link>)}</nav>
  </>;
}

