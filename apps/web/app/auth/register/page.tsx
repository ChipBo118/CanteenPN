import Link from 'next/link';
import { AuthShell } from '@/components/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';

export default function RegisterPage() { return <AuthShell title="Đăng ký sinh viên" description="Chỉ cần email trường và mật khẩu. Mã sinh viên, họ tên, khoa và lớp sẽ được lấy tự động từ StudentDirectory." footer={<>Đã có tài khoản? <Link className="font-bold text-brand-600" href="/auth/login">Đăng nhập</Link></>}><AuthForm mode="register" /></AuthShell>; }

