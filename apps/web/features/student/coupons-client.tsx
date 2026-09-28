'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Gift, Ticket, WalletCards } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { apiRequest, authHeaders, formatDateTime, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Offer={id:string;code:string;name:string;description:string;type?:string;discountType?:string;discountValue:number;requiredPoints?:number;remainingQuantity?:number;minimumOrderValue:number;expireAt:string};
type Owned={id:string;serialCode:string;status:'ACTIVE'|'USED'|'EXPIRED'|'REVOKED';redeemedAt:string;usedAt?:string;voucher:Offer};
type Loyalty={points:number};

export function CouponsClient(){
  const token=useAuthStore(state=>state.accessToken); const queryClient=useQueryClient();
  const query=useQuery({queryKey:['offers'],queryFn:async()=>({coupons:await apiRequest<Offer[]>('/coupons'),vouchers:await apiRequest<Offer[]>('/vouchers'),owned:await apiRequest<Owned[]>('/student-vouchers',{headers:authHeaders(token)}),loyalty:await apiRequest<Loyalty>('/loyalty',{headers:authHeaders(token)})}),enabled:!!token});
  const acquire=useMutation({mutationFn:({id,free}:{id:string;free:boolean})=>apiRequest(`/vouchers/${id}/${free?'claim':'redeem'}`,{method:'POST',headers:authHeaders(token)}),onSuccess:()=>{queryClient.invalidateQueries({queryKey:['offers']});queryClient.invalidateQueries({queryKey:['student','rewards']});}});
  if(query.isLoading||!query.data)return <LoadingState/>;
  const {coupons,vouchers,owned,loyalty}=query.data; const error=acquire.error as {message?:string}|null;
  const offerCard=(offer:Offer,isVoucher=false)=><article key={offer.id} className="surface relative overflow-hidden rounded-3xl p-6"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">{isVoucher?<Gift/>:<Ticket/>}</span><p className="eyebrow mt-6">{offer.code}</p><h3 className="mt-2 text-xl font-black">{offer.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-[color:var(--muted)]">{offer.description}</p><p className="mt-4 text-lg font-black text-brand-600">{(offer.type??offer.discountType)==='PERCENTAGE'?`${offer.discountValue}%`:`-${formatMoney(offer.discountValue)}`}</p><p className="mt-2 text-xs">Đơn tối thiểu {formatMoney(offer.minimumOrderValue)} · Hết hạn {formatDateTime(offer.expireAt)}</p>{isVoucher&&<><p className="mt-2 text-xs font-bold">Còn {offer.remainingQuantity?.toLocaleString('vi-VN')} lượt</p><button onClick={()=>acquire.mutate({id:offer.id,free:offer.requiredPoints===0})} className="button-primary mt-5 w-full" disabled={acquire.isPending}>{offer.requiredPoints===0?'Nhận miễn phí':`${offer.requiredPoints?.toLocaleString('vi-VN')} điểm · Đổi ngay`}</button></>}</article>;
  return <div className="space-y-10">
    <section className="flex flex-col justify-between gap-4 rounded-3xl bg-gradient-to-r from-amber-300 to-orange-400 p-6 text-brand-900 sm:flex-row sm:items-center"><div><p className="text-sm font-bold opacity-70">Điểm khả dụng</p><p className="mt-1 text-4xl font-black">{loyalty.points.toLocaleString('vi-VN')}</p></div><WalletCards size={42}/></section>
    {error&&<p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{error.message??'Không thể nhận voucher.'}</p>}
    <section><h2 className="mb-4 text-2xl font-black">Voucher của tôi</h2>{owned.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{owned.map(item=><article key={item.id} className="surface rounded-3xl p-6"><div className="flex items-start justify-between"><Gift className="text-brand-600"/><span className={`rounded-full px-3 py-1 text-xs font-bold ${item.status==='ACTIVE'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{item.status==='ACTIVE'?'Có thể dùng':item.status==='USED'?'Đã dùng':item.status==='EXPIRED'?'Hết hạn':'Đã thu hồi'}</span></div><h3 className="mt-4 text-lg font-black">{item.voucher.name}</h3><button className="mt-4 flex w-full items-center justify-between rounded-2xl border border-dashed border-brand-300 bg-brand-50 px-4 py-3 font-mono text-sm font-black text-brand-800" onClick={()=>navigator.clipboard.writeText(item.serialCode)}>{item.serialCode}<Copy size={16}/></button><p className="mt-3 text-xs text-[color:var(--muted)]">Hết hạn {formatDateTime(item.voucher.expireAt)}</p></article>)}</div>:<EmptyState title="Bạn chưa có voucher"/>}</section>
    <section><h2 className="mb-4 text-2xl font-black">Nhận hoặc đổi voucher</h2>{vouchers.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{vouchers.map(offer=>offerCard(offer,true))}</div>:<EmptyState title="Chưa có voucher khả dụng"/>}</section>
    <section><h2 className="mb-4 text-2xl font-black">Coupon đang hoạt động</h2><p className="mb-4 text-sm text-[color:var(--muted)]">Nhập mã coupon tại bước thanh toán. Coupon không cần nhận trước.</p>{coupons.length?<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coupons.map(offer=>offerCard(offer))}</div>:<EmptyState title="Chưa có coupon khả dụng"/>}</section>
    <p className="flex items-center gap-2 text-sm text-[color:var(--muted)]"><Check size={16}/>Voucher đang hoạt động sẽ xuất hiện trong danh sách chọn ở trang thanh toán.</p>
  </div>;
}
