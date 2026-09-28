'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { apiRequest, type ApiFailure } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

const schema = z.object({
  email: z.email('Email không hợp lệ.'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự.'),
  confirmPassword: z.string().optional(),
}).refine(data => data.confirmPassword === undefined || data.password === data.confirmPassword, { path: ['confirmPassword'], message: 'Mật khẩu xác nhận không khớp.' });
type Values = z.infer<typeof schema>;
type Session = { accessToken: string; user: { id: string; email: string; displayName: string; role: 'ADMIN' | 'CASHIER' | 'KITCHEN_STAFF' | 'STUDENT' } };

export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const router = useRouter();
  const setSession = useAuthStore(state => state.setSession);
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });
  const onSubmit = handleSubmit(async values => {
    setServerError('');
    try {
      const session = await apiRequest<Session>(mode === 'register' ? '/auth/register/student' : '/auth/login', { method: 'POST', body: JSON.stringify(values) });
      setSession(session.accessToken, session.user);
      const destination = session.user.role === 'ADMIN' ? '/admin' : session.user.role === 'CASHIER' ? '/cashier' : session.user.role === 'KITCHEN_STAFF' ? '/kitchen' : '/';
      router.replace(destination);
    } catch (error) { setServerError((error as ApiFailure).message ?? 'Không thể hoàn tất yêu cầu.'); }
  });

  return <form onSubmit={onSubmit} className="mt-8 space-y-5" noValidate>
    {serverError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:bg-red-950/30 dark:text-red-200">{serverError}</div>}
    <label className="block"><span className="mb-2 block text-sm font-bold">{mode === 'login' ? 'Email' : 'Email trường'}</span><input {...register('email')} type="email" autoComplete="email" placeholder="2373240001@hpn.edu.vn" className="field" />{errors.email && <span className="mt-1 block text-sm text-red-600">{errors.email.message}</span>}</label>
    <label className="block"><span className="mb-2 block text-sm font-bold">Mật khẩu</span><span className="relative block"><input {...register('password')} type={show ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} className="field pr-12" /><button type="button" onClick={() => setShow(value => !value)} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-brand-50 hover:text-brand-700" aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>{errors.password && <span className="mt-1 block text-sm text-red-600">{errors.password.message}</span>}</label>
    {mode === 'register' && <label className="block"><span className="mb-2 block text-sm font-bold">Xác nhận mật khẩu</span><input {...register('confirmPassword')} type={show ? 'text' : 'password'} autoComplete="new-password" className="field" />{errors.confirmPassword && <span className="mt-1 block text-sm text-red-600">{errors.confirmPassword.message}</span>}</label>}
    <button className="button-primary w-full" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="animate-spin" size={19} /> : <>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight size={18} /></>}</button>
  </form>;
}
