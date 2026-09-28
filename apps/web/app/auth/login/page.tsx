import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';

export default function LoginPage() { return <AuthShell title="Chào mừng trở lại" description="Đăng nhập để đặt món, theo dõi trạng thái và nhận món đúng giờ." footer={<>Chưa có tài khoản? <Link className="font-bold text-brand-600" href="/auth/register">Đăng ký sinh viên</Link></>}><AuthForm mode="login" /><div className="mt-4 text-right"><Link href="/auth/forgot-password" className="text-sm font-semibold text-brand-600">Quên mật khẩu?</Link></div></AuthShell>; }

