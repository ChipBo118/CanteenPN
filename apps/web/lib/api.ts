export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type ApiFailure = { statusCode: number; code: string; message: string; details?: unknown };

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw body as ApiFailure;
  return body as T;
}

export function authHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
export const formatQuantity = (value: string | number, maximumFractionDigits = 3) =>
  new Intl.NumberFormat('vi-VN', { maximumFractionDigits }).format(Number(value));
export const formatDateTime = (value: string | Date) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
