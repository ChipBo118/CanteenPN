'use client';

import { useQuery } from '@tanstack/react-query';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { API_URL, apiRequest, authHeaders } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { EmptyState, LoadingState } from '@/components/loading-state';

const types=['revenue','orders','products','inventory','employees','attendance','reviews'];
type Category={id:string;name:string}; type Employee={id:string;fullName:string;employeeCode:string};

export function ReportsClient(){
  const token=useAuthStore(s=>s.accessToken);
  const [filters,setFilters]=useState({type:'revenue',from:new Date(Date.now()-30*864e5).toISOString().slice(0,10),to:new Date().toISOString().slice(0,10),categoryId:'',employeeId:'',paymentMethod:''});
  const categories=useQuery({queryKey:['admin-categories-report'],queryFn:()=>apiRequest<Category[]>('/admin/categories',{headers:authHeaders(token)}),enabled:!!token});
  const employees=useQuery({queryKey:['admin-employees-report'],queryFn:()=>apiRequest<Employee[]>('/admin/employees',{headers:authHeaders(token)}),enabled:!!token});
  const params=useMemo(()=>new URLSearchParams(Object.entries(filters).filter(([key,value])=>key!=='type'&&value)).toString(),[filters]);
  const report=useQuery({queryKey:['report',filters],queryFn:()=>apiRequest<any[]>(`/admin/reports/${filters.type}?${params}`,{headers:authHeaders(token)}),enabled:!!token});
  const set=(key:keyof typeof filters,value:string)=>setFilters(current=>({...current,[key]:value}));
  const download=async(format:'csv'|'xlsx')=>{const response=await fetch(`${API_URL}/admin/reports/${filters.type}/export?format=${format}&${params}`,{headers:authHeaders(token),credentials:'include'});const blob=await response.blob();const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`canteenpn-${filters.type}.${format}`;anchor.click();URL.revokeObjectURL(url)};
  return <div className="space-y-6"><div><p className="eyebrow">Phân tích vận hành</p><h2 className="mt-2 text-3xl font-black">Trung tâm báo cáo</h2></div><section className="surface grid gap-4 rounded-3xl p-5 md:grid-cols-3 xl:grid-cols-6"><Field label="Loại báo cáo"><select className="field" value={filters.type} onChange={e=>set('type',e.target.value)}>{types.map(v=><option key={v} value={v}>{v}</option>)}</select></Field><Field label="Từ ngày"><input className="field" type="date" value={filters.from} onChange={e=>set('from',e.target.value)}/></Field><Field label="Đến ngày"><input className="field" type="date" value={filters.to} onChange={e=>set('to',e.target.value)}/></Field><Field label="Danh mục"><select className="field" value={filters.categoryId} onChange={e=>set('categoryId',e.target.value)}><option value="">Tất cả</option>{categories.data?.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></Field><Field label="Nhân viên"><select className="field" value={filters.employeeId} onChange={e=>set('employeeId',e.target.value)}><option value="">Tất cả</option>{employees.data?.map(v=><option key={v.id} value={v.id}>{v.employeeCode} · {v.fullName}</option>)}</select></Field><Field label="Thanh toán"><select className="field" value={filters.paymentMethod} onChange={e=>set('paymentMethod',e.target.value)}><option value="">Tất cả</option><option>CASH</option><option>VNPAY_QR_MOCK</option><option>CANTEEN_WALLET</option></select></Field><div className="flex gap-2 md:col-span-3 xl:col-span-6"><button onClick={()=>download('csv')} className="button-secondary"><Download size={17}/>CSV</button><button onClick={()=>download('xlsx')} className="button-primary"><FileSpreadsheet size={17}/>XLSX</button></div></section>{report.isLoading?<LoadingState/>:report.isError?<EmptyState title="Không thể tạo báo cáo" detail="Kiểm tra bộ lọc rồi thử lại."/>:report.data?.length?<section className="surface rounded-3xl p-6"><h3 className="text-xl font-black">Kết quả: {report.data.length} bản ghi</h3><pre className="mt-4 max-h-[460px] overflow-auto rounded-2xl bg-brand-900 p-5 text-xs leading-6 text-brand-50">{JSON.stringify(report.data.slice(0,30),null,2)}</pre></section>:<EmptyState title="Không có dữ liệu trong kỳ"/>}</div>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label><span className="mb-2 block text-xs font-bold uppercase">{label}</span>{children}</label>}
