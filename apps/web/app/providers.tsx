'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Session = { accessToken: string; user: { id: string; email: string; displayName: string; role: 'ADMIN' | 'CASHIER' | 'KITCHEN_STAFF' | 'STUDENT' } };

export function Providers({ children }: { children: React.ReactNode }) {
  const setSession = useAuthStore(state => state.setSession);
  const finishHydration = useAuthStore(state => state.finishHydration);
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));

  useEffect(() => {
    apiRequest<Session>('/auth/refresh', { method: 'POST' })
      .then(session => setSession(session.accessToken, session.user))
      .catch(() => finishHydration());
  }, [finishHydration, setSession]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
