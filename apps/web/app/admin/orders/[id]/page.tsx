import { AdminOrderDetail } from '@/features/admin/admin-order-detail';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminOrderDetail id={id} />;
}
