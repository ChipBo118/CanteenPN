'use client';

import { LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';

type Role = 'ADMIN' | 'CASHIER' | 'KITCHEN_STAFF' | 'STUDENT';
export function RequireSession({ roles, children }: { roles?: Role[]; children: React.ReactNode }) {
  const { user, hydrated } = useAuthStore();
  const router = useRouter();
  useEffect(() => { if (hydrated && (!user || (roles && !roles.includes(user.role)))) router.replace('/auth/login'); }, [hydrated, roles, router, user]);
  if (!hydrated || !user || (roles && !roles.includes(user.role))) return <div className="grid min-h-[60vh] place-items-center"><LoaderCircle className="animate-spin text-brand-600" size={30} /></div>;
  return children;
}
