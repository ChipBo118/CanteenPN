'use client';

import { useState } from 'react';
import { apiRequest } from '@/lib/api';

export function RecoveryForm({ mode }: { mode: 'forgot' | 'reset' }) {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    if (mode === 'reset' && password !== confirmPassword) { setMessage('Mật khẩu xác nhận không khớp.'); return; }
    setPending(true);
    try {
      const result = await apiRequest<{ message?: string; resetToken?: string }>(mode === 'forgot' ? '/auth/forgot-password' : '/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(mode === 'forgot' ? { email } : { token, password, confirmPassword }),
      });
      setMessage(result.resetToken ? `${result.message} Token demo: ${result.resetToken}` : result.message ?? 'Hoàn tất yêu cầu.');
    } catch (error: any) { setMessage(error.message ?? 'Không thể hoàn tất yêu cầu.'); }
    finally { setPending(false); }
  };

  return <form onSubmit={submit} className="mt-8 space-y-5">
    {mode === 'forgot' ? <label className="block"><span className="mb-2 block text-sm font-bold">Email trường</span><input className="field" type="email" required value={email} onChange={event => setEmail(event.target.value)} placeholder="2373240001@hpn.edu.vn" /></label> : <>
      <label className="block"><span className="mb-2 block text-sm font-bold">Token đặt lại</span><input className="field" required value={token} onChange={event => setToken(event.target.value)} /></label>
      <label className="block"><span className="mb-2 block text-sm font-bold">Mật khẩu mới</span><input className="field" type="password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="Có chữ hoa, chữ thường và số" /></label>
      <label className="block"><span className="mb-2 block text-sm font-bold">Xác nhận mật khẩu</span><input className="field" type="password" minLength={8} required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
    </>}
    <button className="button-primary w-full" disabled={pending}>{pending ? 'Đang xử lý…' : mode === 'forgot' ? 'Gửi yêu cầu' : 'Đặt lại mật khẩu'}</button>
    {message && <p role="status" className="break-all rounded-2xl bg-brand-50 p-4 text-sm font-bold text-brand-700 dark:bg-brand-900/30">{message}</p>}
  </form>;
}
