'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const sections = [
  { href: '/admin/menu/products', label: 'Món ăn' },
  { href: '/admin/menu/categories', label: 'Danh mục' },
  { href: '/admin/menu/combos', label: 'Combo' },
];

export default function MenuLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      <nav aria-label="Quản lý thực đơn" className="flex flex-wrap gap-2 border-b pb-3">
        {sections.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${active ? 'bg-brand-600 text-white' : 'text-[color:var(--muted)] hover:bg-brand-50 hover:text-brand-700'}`}>{label}</Link>;
        })}
      </nav>
      {children}
    </div>
  );
}
