'use client';

import { create } from 'zustand';

type SessionUser = { id: string; email: string; displayName: string; role: 'ADMIN' | 'CASHIER' | 'KITCHEN_STAFF' | 'STUDENT' };
type AuthState = { accessToken?: string; user?: SessionUser; hydrated: boolean; setSession: (token: string, user: SessionUser) => void; clear: () => void; finishHydration: () => void };

export const useAuthStore = create<AuthState>(set => ({
  hydrated: false,
  setSession: (accessToken, user) => set({ accessToken, user, hydrated: true }),
  clear: () => set({ accessToken: undefined, user: undefined, hydrated: true }),
  finishHydration: () => set({ hydrated: true }),
}));
