'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, Building2, CheckCircle2, Clock3, WalletCards } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { apiRequest, authHeaders, formatDateTime, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type WalletTransaction={id:string;type:string;amount:number;description:string;reference:string;createdAt:string};
type WalletRequest={id:string;requestCode:string;type:'DEPOSIT'|'WITHDRAWAL';amount:number;method?:string;status:'PENDING'|'APPROVED'|'REJECTED';note?:string;adminNote?:string;createdAt:string};
type WalletData={balance:number;status:string;bankName?:string;bankAccountNumber?:string;bankAccountName?:string;bankLinkedAt?:string;transactions:WalletTransaction[];requests:WalletRequest[]};
type DepositResult=WalletRequest&{qrPayload?:string|null};

const statusText={PENDING:'Chờ duyệt',APPROVED:'Đã duyệt',REJECTED:'Từ chối'} as const;
const amountOptions=[50000,100000,200000,500000];

export function WalletClient(){
  const token=useAuthStore(state=>state.accessToken); const queryClient=useQueryClient();
  const [depositAmount,setDepositAmount]=useState(100000); const [method,setMethod]=useState<'QR'|'CASH'>('QR'); const [withdrawAmount,setWithdrawAmount]=useState(50000); const [message,setMessage]=useState(''); const [qr,setQr]=useState<{payload:string;code:string;amount:number}|null>(null);
  const [bank,setBank]=useState({bankName:'',accountNumber:'',accountName:''});
  const query=useQuery({queryKey:['wallet'],queryFn:()=>apiRequest<WalletData>('/wallet',{headers:authHeaders(token)}),enabled:!!token});
  const refresh=()=>{queryClient.invalidateQueries({queryKey:['wallet']});queryClient.invalidateQueries({queryKey:['student','wallet']});};
  const deposit=useMutation({mutationFn:()=>apiRequest<DepositResult>('/wallet/deposit',{method:'POST',headers:authHeaders(token),body:JSON.stringify({amount:depositAmount,method})}),onSuccess:data=>{setMessage('Đã tạo yêu cầu nạp tiền. Quản trị viên sẽ xác nhận sau khi đối soát.');setQr(data.qrPayload?{payload:data.qrPayload,code:data.requestCode,amount:data.amount}:null);refresh();}});
  const withdraw=useMutation({mutationFn:()=>apiRequest<WalletRequest>('/wallet/withdraw',{method:'POST',headers:authHeaders(token),body:JSON.stringify({amount:withdrawAmount})}),onSuccess:()=>{setMessage('Đã gửi yêu cầu rút tiền. Số tiền được tạm giữ trong lúc chờ duyệt.');refresh();}});
  const linkBank=useMutation({mutationFn:()=>apiRequest('/wallet/link-bank',{method:'POST',headers:authHeaders(token),body:JSON.stringify(bank)}),onSuccess:()=>{setMessage('Đã liên kết tài khoản ngân hàng.');refresh();}});
  const error=(deposit.error??withdraw.error??linkBank.error) as {message?:string}|null;
  if(query.isLoading||!query.data)return <LoadingState/>; const wallet=query.data;
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-4xl bg-brand-900 p-7 text-white shadow-soft"><WalletCards size={34}/><p className="mt-8 text-sm text-white/60">Số dư khả dụng</p><p className="mt-2 text-4xl font-black">{formatMoney(wallet.balance)}</p><p className="mt-3 text-sm text-white/70">Trạng thái: {wallet.status==='ACTIVE'?'Đang hoạt động':wallet.status}</p></section>
    {(message||error)&&<p className={`rounded-2xl p-4 text-sm font-bold ${error?'bg-red-50 text-red-700':'bg-brand-50 text-brand-700'}`}>{error?.message??message}</p>}
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="surface rounded-3xl p-6"><ArrowDownToLine className="text-brand-600"/><h2 className="mt-4 text-xl font-black">Nạp tiền vào ví</h2><p className="mt-2 text-sm text-[color:var(--muted)]">Chọn số tiền và hình thức nộp. Giao dịch được cộng sau khi đối soát.</p><div className="mt-5 flex flex-wrap gap-2">{amountOptions.map(value=><button key={value} onClick={()=>setDepositAmount(value)} className={depositAmount===value?'button-primary':'button-secondary'}>{formatMoney(value)}</button>)}</div><input className="field mt-3" type="number" min={10000} max={50000000} step={10000} value={depositAmount} onChange={event=>setDepositAmount(Number(event.target.value))}/><div className="mt-3 grid grid-cols-2 gap-2">{(['QR','CASH'] as const).map(value=><button key={value} onClick={()=>setMethod(value)} className={method===value?'button-primary':'button-secondary'}>{value==='QR'?'Chuyển khoản QR':'Nộp tại quầy'}</button>)}</div><button className="button-primary mt-4 w-full" disabled={deposit.isPending} onClick={()=>deposit.mutate()}>{deposit.isPending?'Đang tạo…':'Tạo yêu cầu nạp'}</button>{qr&&<div className="mt-5 grid place-items-center rounded-3xl bg-white p-5 text-center text-brand-900"><QRCodeSVG value={qr.payload} size={164}/><p className="mt-3 font-black">{formatMoney(qr.amount)}</p><p className="text-xs">Nội dung: {qr.code}</p></div>}</section>
      <section className="surface rounded-3xl p-6"><ArrowUpFromLine className="text-brand-600"/><h2 className="mt-4 text-xl font-black">Rút tiền về ngân hàng</h2>{wallet.bankLinkedAt?<div className="mt-4 rounded-2xl bg-brand-50 p-4 text-sm"><p className="font-black">{wallet.bankName}</p><p>{wallet.bankAccountNumber} · {wallet.bankAccountName}</p></div>:<div className="mt-4 space-y-3"><input className="field" placeholder="Tên ngân hàng" value={bank.bankName} onChange={event=>setBank({...bank,bankName:event.target.value})}/><input className="field" placeholder="Số tài khoản" value={bank.accountNumber} onChange={event=>setBank({...bank,accountNumber:event.target.value})}/><input className="field" placeholder="Tên chủ tài khoản" value={bank.accountName} onChange={event=>setBank({...bank,accountName:event.target.value})}/><button className="button-secondary w-full" disabled={linkBank.isPending} onClick={()=>linkBank.mutate()}><Building2 size={17}/>Liên kết ngân hàng</button></div>}<input className="field mt-4" type="number" min={20000} max={50000000} step={10000} value={withdrawAmount} onChange={event=>setWithdrawAmount(Number(event.target.value))}/><button className="button-primary mt-4 w-full" disabled={!wallet.bankLinkedAt||withdraw.isPending} onClick={()=>withdraw.mutate()}>{withdraw.isPending?'Đang gửi…':'Gửi yêu cầu rút'}</button></section>
    </div>
    <section><h2 className="mb-4 text-2xl font-black">Yêu cầu gần đây</h2>{wallet.requests.length?<div className="grid gap-3 md:grid-cols-2">{wallet.requests.map(item=><article key={item.id} className="surface rounded-3xl p-5"><div className="flex items-start justify-between gap-3"><div><p className="eyebrow">{item.requestCode}</p><h3 className="mt-1 font-black">{item.type==='DEPOSIT'?'Nạp':'Rút'} {formatMoney(item.amount)}</h3></div><span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{statusText[item.status]}</span></div><p className="mt-3 text-xs text-[color:var(--muted)]">{formatDateTime(item.createdAt)}{item.adminNote?` · ${item.adminNote}`:''}</p></article>)}</div>:<EmptyState title="Chưa có yêu cầu ví"/>}</section>
    <section><h2 className="mb-4 text-2xl font-black">Lịch sử số dư</h2>{wallet.transactions.length?<div className="space-y-3">{wallet.transactions.map(item=><article key={item.id} className="surface flex items-center justify-between gap-4 rounded-2xl p-4"><div className="flex items-center gap-3">{item.amount>=0?<CheckCircle2 className="text-emerald-600"/>:<Clock3 className="text-orange-500"/>}<div><p className="font-bold">{item.description}</p><p className="text-xs text-[color:var(--muted)]">{formatDateTime(item.createdAt)} · {item.reference}</p></div></div><p className={`font-black ${item.amount>=0?'text-emerald-600':'text-red-600'}`}>{item.amount>=0?'+':''}{formatMoney(item.amount)}</p></article>)}</div>:<EmptyState title="Chưa có giao dịch"/>}</section>
  </div>;
}
