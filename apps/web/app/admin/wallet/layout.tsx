'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { apiRequest, authHeaders, formatMoney, type ApiFailure } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type WalletSummary = { totalDeposits: number; totalWithdrawals: number };
type WalletTransaction = { type: string; amount: number; reference: string };
type WalletRequest = { id: string; type: string; status: string };

const sections = [
  { href: '/admin/wallet/requests', label: 'Yêu cầu nạp / rút' },
  { href: '/admin/wallet/transactions', label: 'Lịch sử giao dịch' },
];

async function loadWalletSummary(token?: string): Promise<WalletSummary> {
  const headers = authHeaders(token);
  try {
    return await apiRequest<WalletSummary>('/admin/wallet-summary', { headers });
  } catch (error) {
    // Keep the dashboard compatible with API instances that have not yet exposed
    // the summary route by rebuilding the same totals from existing ledger data.
    if ((error as ApiFailure).statusCode !== 404) throw error;
  }

  const [transactions, openRequests] = await Promise.all([
    apiRequest<WalletTransaction[]>('/admin/wallet-transactions', { headers }),
    apiRequest<WalletRequest[]>('/admin/wallet-requests', { headers }),
  ]);
  const nonApprovedWithdrawals = new Set(
    openRequests
      .filter((request) => request.type === 'WITHDRAWAL' && request.status !== 'APPROVED')
      .map((request) => `WITHDRAW-${request.id}`),
  );

  return {
    totalDeposits: transactions
      .filter((transaction) => transaction.type === 'TOP_UP')
      .reduce((total, transaction) => total + transaction.amount, 0),
    totalWithdrawals: transactions
      .filter((transaction) => transaction.type === 'WITHDRAWAL' && !nonApprovedWithdrawals.has(transaction.reference))
      .reduce((total, transaction) => total + Math.abs(transaction.amount), 0),
  };
}

export default function WalletLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const token = useAuthStore((state) => state.accessToken);
  const summary = useQuery({ queryKey: ['admin-wallet-summary'], queryFn: () => loadWalletSummary(token), enabled: !!token, refetchInterval: 30_000 });
  return <div className="space-y-6">
    <div className="grid gap-4 sm:grid-cols-2">
      <article className="surface flex items-center gap-4 rounded-3xl p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-900/30"><ArrowDownLeft size={21}/></span><div><p className="text-sm text-[color:var(--muted)]">Tổng nạp ví</p><p className="mt-1 text-2xl font-black">{summary.isLoading ? '…' : summary.data ? formatMoney(summary.data.totalDeposits) : '—'}</p></div></article>
      <article className="surface flex items-center gap-4 rounded-3xl p-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-amber-50 text-amber-700"><ArrowUpRight size={21}/></span><div><p className="text-sm text-[color:var(--muted)]">Tổng rút ví</p><p className="mt-1 text-2xl font-black">{summary.isLoading ? '…' : summary.data ? formatMoney(summary.data.totalWithdrawals) : '—'}</p></div></article>
    </div>
    {summary.isError && <p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">Không thể tải tổng nạp/rút ví. <button type="button" className="underline" onClick={() => summary.refetch()}>Thử lại</button></p>}
    <nav aria-label="Quản lý ví điện tử" className="flex flex-wrap gap-2 border-b pb-3">{sections.map(({ href, label }) => <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} className={`rounded-xl px-4 py-2.5 text-sm font-bold transition ${pathname === href ? 'bg-brand-600 text-white' : 'text-[color:var(--muted)] hover:bg-brand-50 hover:text-brand-700'}`}>{label}</Link>)}</nav>{children}
  </div>;
}
