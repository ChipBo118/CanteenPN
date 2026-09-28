'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, EyeOff, Pencil, Plus, RefreshCw, Trash2, Wrench } from 'lucide-react';
import { EmptyState, LoadingState } from '@/components/loading-state';
import { StatusBadge } from '@/components/status-badge';
import { apiRequest, authHeaders, formatDateTime, formatMoney } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type Row=Record<string,any>;
const endpoints:Record<string,string>={suppliers:'/admin/suppliers','stock-receipts':'/admin/stock-receipts',shifts:'/admin/shifts',attendance:'/admin/attendance',reviews:'/admin/reviews',coupons:'/admin/coupons',vouchers:'/admin/vouchers','wallet-requests':'/admin/wallet-requests'};
const titles:Record<string,string>={suppliers:'Nhà cung cấp','stock-receipts':'Phiếu nhập kho',shifts:'Ca làm',attendance:'Chấm công',reviews:'Kiểm duyệt đánh giá',coupons:'Coupon',vouchers:'Voucher đổi điểm','wallet-requests':'Yêu cầu nạp / rút ví'};
const ask=(label:string,initial='')=>window.prompt(label,initial)?.trim();
const number=(label:string,initial:string)=>Number(ask(label,initial));
const iso=(value:string)=>new Date(`${value}T00:00:00+07:00`).toISOString();
const formatShiftDate=(value:string|Date)=>{
  const dateText=typeof value==='string'?value.slice(0,10):value.toISOString().slice(0,10);
  return new Intl.DateTimeFormat('vi-VN',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date(`${dateText}T12:00:00+07:00`));
};

export function AdminWorkflows({resource}:{resource:string}){
  const token=useAuthStore(state=>state.accessToken); const queryClient=useQueryClient(); const endpoint=endpoints[resource];
  const query=useQuery({queryKey:['admin-workflow',resource],queryFn:()=>apiRequest<Row[]>(endpoint,{headers:authHeaders(token)}),enabled:!!token&&!!endpoint});
  const employees=useQuery({queryKey:['admin-employees-select'],queryFn:()=>apiRequest<Row[]>('/admin/employees',{headers:authHeaders(token)}),enabled:!!token&&['stock-receipts','shifts'].includes(resource)});
  const suppliers=useQuery({queryKey:['admin-suppliers-select'],queryFn:()=>apiRequest<Row[]>('/admin/suppliers',{headers:authHeaders(token)}),enabled:!!token&&resource==='stock-receipts'});
  const ingredients=useQuery({queryKey:['admin-ingredients-select'],queryFn:()=>apiRequest<Row[]>('/admin/ingredients',{headers:authHeaders(token)}),enabled:!!token&&resource==='stock-receipts'});
  const mutation=useMutation({mutationFn:({url,method='POST',body}:{url:string;method?:string;body?:unknown})=>apiRequest(url,{method,headers:authHeaders(token),body:body===undefined?undefined:JSON.stringify(body)}),onSuccess:()=>{queryClient.invalidateQueries({queryKey:['admin-workflow',resource]});if(resource==='wallet-requests')queryClient.invalidateQueries({queryKey:['admin-wallet-summary']});}});

  function create(){
    if(resource==='suppliers'){
      const name=ask('Tên nhà cung cấp'); if(!name)return;
      mutation.mutate({url:endpoint,body:{name,contactName:ask('Người liên hệ')||name,phone:ask('Số điện thoại')||'Chưa cập nhật',email:ask('Email (có thể bỏ trống)')||undefined,address:ask('Địa chỉ')||'Chưa cập nhật'}}); return;
    }
    if(resource==='stock-receipts'){
      const supplierId=ask(`ID nhà cung cấp:\n${suppliers.data?.map(item=>`${item.name}: ${item.id}`).join('\n')}`); const employeeId=ask(`ID nhân viên nhận:\n${employees.data?.map(item=>`${item.fullName}: ${item.id}`).join('\n')}`); const ingredientId=ask(`ID nguyên liệu:\n${ingredients.data?.map(item=>`${item.name}: ${item.id}`).join('\n')}`); if(!supplierId||!employeeId||!ingredientId)return;
      const quantity=number('Số lượng','1'); const unitCost=number('Đơn giá nguyên VND','10000'); if(!quantity||!Number.isInteger(unitCost))return;
      mutation.mutate({url:endpoint,body:{supplierId,employeeId,receivedAt:new Date().toISOString(),note:ask('Ghi chú')||undefined,items:[{ingredientId,quantity,unitCost}]}}); return;
    }
    if(resource==='shifts'){
      const employeeId=ask(`ID nhân viên:\n${employees.data?.map(item=>`${item.fullName} (${item.workRole}): ${item.id}`).join('\n')}`); const employee=employees.data?.find(item=>item.id===employeeId); const date=ask('Ngày làm (YYYY-MM-DD)',new Date().toISOString().slice(0,10)); if(!employeeId||!employee||!date)return;
      mutation.mutate({url:endpoint,body:{employeeId,date:iso(date),startTime:ask('Bắt đầu (HH:mm)','07:00'),endTime:ask('Kết thúc (HH:mm)','15:00'),workRole:employee.workRole,note:ask('Ghi chú')||undefined}}); return;
    }
    if(resource==='coupons'){
      const code=ask('Mã coupon'); if(!code)return; const start=ask('Bắt đầu (YYYY-MM-DD)',new Date().toISOString().slice(0,10)); const end=ask('Hết hạn (YYYY-MM-DD)',new Date(Date.now()+30*86400000).toISOString().slice(0,10)); if(!start||!end)return;
      mutation.mutate({url:endpoint,body:{code,name:ask('Tên chương trình')||code,description:ask('Mô tả')||code,type:'PERCENTAGE',discountValue:number('Phần trăm giảm','10'),minimumOrderValue:number('Đơn tối thiểu','0'),maximumDiscount:number('Giảm tối đa','20000'),startAt:iso(start),expireAt:iso(end),usageLimit:number('Tổng lượt dùng','100'),perStudentLimit:number('Lượt mỗi sinh viên','1'),requiresCombo:false}}); return;
    }
    if(resource==='vouchers'){
      const code=ask('Mã voucher'); if(!code)return; const start=ask('Bắt đầu (YYYY-MM-DD)',new Date().toISOString().slice(0,10)); const end=ask('Hết hạn (YYYY-MM-DD)',new Date(Date.now()+30*86400000).toISOString().slice(0,10)); if(!start||!end)return;
      mutation.mutate({url:endpoint,body:{code,name:ask('Tên voucher')||code,description:ask('Mô tả')||code,discountType:'FIXED_AMOUNT',discountValue:number('Số tiền giảm','10000'),requiredPoints:number('Điểm đổi','100'),totalQuantity:number('Số lượng','100'),minimumOrderValue:number('Đơn tối thiểu','0'),maximumDiscount:number('Giảm tối đa','10000'),startAt:iso(start),expireAt:iso(end),perStudentLimit:number('Lượt mỗi sinh viên','1')}});
    }
  }
  function act(row:Row){
    if(resource==='stock-receipts'){if(row.status==='DRAFT'&&window.confirm(`Xác nhận phiếu ${row.receiptCode}? Tồn kho sẽ tăng và không thể xác nhận lại.`))mutation.mutate({url:`${endpoint}/${row.id}/confirm`});return;}
    if(resource==='reviews'){const hidden=!row.isHidden;const reason=hidden?ask('Lý do ẩn đánh giá','Nội dung không phù hợp'):undefined;if(hidden&&!reason)return;mutation.mutate({url:`${endpoint}/${row.id}`,method:'PATCH',body:{isHidden:hidden,reason}});return;}
    if(resource==='attendance'){const clockInAt=ask('Clock-in ISO',row.clockInAt??'');const clockOutAt=ask('Clock-out ISO',row.clockOutAt??'');const reason=ask('Lý do hiệu chỉnh');if(!reason)return;mutation.mutate({url:`${endpoint}/${row.id}`,method:'PATCH',body:{clockInAt:clockInAt||undefined,clockOutAt:clockOutAt||undefined,reason}});}
  }
  function edit(row:Row){
    if(resource==='shifts'){
      const employeeId=ask(`ID nhân viên:\n${employees.data?.map(item=>`${item.fullName} (${item.workRole}): ${item.id}`).join('\n')}`,row.employeeId); const employee=employees.data?.find(item=>item.id===employeeId); const date=ask('Ngày làm (YYYY-MM-DD)',String(row.date).slice(0,10)); const startTime=ask('Bắt đầu (HH:mm)',row.startTime); const endTime=ask('Kết thúc (HH:mm)',row.endTime); if(!employeeId||!employee||!date||!startTime||!endTime)return;
      mutation.mutate({url:`${endpoint}/${row.id}`,method:'PATCH',body:{employeeId,date:iso(date),startTime,endTime,workRole:employee.workRole,note:ask('Ghi chú',row.note??'')||undefined}});return;
    }
    if(resource==='vouchers'){
      const code=ask('Mã voucher',row.code); const name=ask('Tên voucher',row.name); const description=ask('Mô tả',row.description); const start=ask('Bắt đầu (YYYY-MM-DD)',String(row.startAt).slice(0,10)); const end=ask('Hết hạn (YYYY-MM-DD)',String(row.expireAt).slice(0,10)); if(!code||!name||!description||!start||!end)return;
      mutation.mutate({url:`${endpoint}/${row.id}`,method:'PATCH',body:{code,name,description,discountType:row.discountType,discountValue:number('Số tiền giảm',String(row.discountValue)),requiredPoints:number('Điểm đổi',String(row.requiredPoints)),totalQuantity:number('Tổng số lượng',String(row.totalQuantity)),minimumOrderValue:number('Đơn tối thiểu',String(row.minimumOrderValue)),maximumDiscount:number('Giảm tối đa',String(row.maximumDiscount??row.discountValue)),startAt:iso(start),expireAt:iso(end),perStudentLimit:number('Lượt mỗi sinh viên',String(row.perStudentLimit))}});
    }
  }
  function remove(row:Row){
    const label=resource==='shifts'?`ca ${row.startTime}–${row.endTime} của ${row.employee?.fullName}`:`voucher ${row.code}`;
    if(window.confirm(`Xóa ${label}?`))mutation.mutate({url:`${endpoint}/${row.id}`,method:'DELETE'});
  }
  function reviewWallet(row:Row,approve:boolean){const reason=ask(approve?'Ghi chú duyệt':'Lý do từ chối',approve?'Đã đối soát giao dịch':'Thông tin giao dịch chưa hợp lệ');if(!reason)return;mutation.mutate({url:`${endpoint}/${row.id}/${approve?'approve':'reject'}`,body:{reason}});}
  if(query.isLoading)return <LoadingState/>;
  const rows=query.data??[];
  const canCreate=!['attendance','reviews','wallet-requests'].includes(resource);
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="eyebrow">Quản trị nghiệp vụ</p><h2 className="mt-2 text-3xl font-black">{titles[resource]}</h2></div>
        <div className="flex gap-2"><button onClick={()=>query.refetch()} className="button-secondary"><RefreshCw size={17}/>Làm mới</button>{canCreate&&<button onClick={create} className="button-primary"><Plus size={17}/>Thêm mới</button>}</div>
      </div>
      {mutation.isError&&<p className="rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-700">{(mutation.error as Error).message}</p>}
      {mutation.isSuccess&&<p className="rounded-2xl bg-brand-50 p-3 text-sm font-bold text-brand-700">Đã cập nhật thành công.</p>}
      {resource==='shifts' ? (
        rows.length ? (
          <section className="surface overflow-hidden rounded-3xl">
            <div className="border-b border-slate-100 px-5 py-4 text-sm font-bold text-[color:var(--muted)] dark:border-white/10">{rows.length} ca làm</div>
            <div className="divide-y divide-slate-100 dark:divide-white/10">
              {rows.map(row=> (
                <article key={row.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-6">
                  <div className="shrink-0 sm:w-56"><p className="font-bold capitalize">{formatShiftDate(row.date)}</p><p className="mt-1 text-sm text-[color:var(--muted)]">{row.startTime} – {row.endTime}</p></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-black">{row.employee?.fullName??'Nhân viên'}</p><p className="mt-1 truncate text-sm text-[color:var(--muted)]">{row.employee?.employeeCode??row.employeeId}{row.note?` · ${row.note}`:''}</p></div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end"><StatusBadge value={row.workRole==='KITCHEN_STAFF'?'Nhân viên bếp':row.workRole==='CASHIER'?'Thu ngân':row.workRole}/><StatusBadge value={row.status==='SCHEDULED'?'Đã xếp lịch':row.status==='COMPLETED'?'Hoàn tất':row.status==='CANCELLED'?'Đã hủy':row.status}/><button onClick={()=>edit(row)} className="button-secondary" aria-label="Sửa ca"><Pencil size={15}/>Sửa</button><button onClick={()=>remove(row)} className="button-secondary text-red-600" aria-label="Xóa ca"><Trash2 size={15}/>Xóa</button></div>
                </article>
              ))}
            </div>
          </section>
        ) : <EmptyState title="Chưa có ca làm" />
      ) : rows.length ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {rows.map(row=><article key={row.id} className="surface rounded-3xl p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-black">{row.requestCode??row.receiptCode??row.code??row.name??row.employee?.fullName??row.product?.name??row.fullName??'Bản ghi'}</h3><p className="mt-1 text-sm text-[color:var(--muted)]">{row.wallet?.studentProfile?.studentDirectory?.fullName??row.description??row.comment??row.contactName??row.employee?.employeeCode??row.serialCode??'CanteenPN'}</p></div>{(row.status||row.workRole)&&<StatusBadge value={row.status??row.workRole}/>}</div><div className="mt-4 grid grid-cols-2 gap-2 text-sm"><span>{row.amount!==undefined?`${row.type==='DEPOSIT'?'Nạp':'Rút'} ${formatMoney(row.amount)}`:row.totalCost!==undefined?formatMoney(row.totalCost):row.rating?`${row.rating}/5 sao`:row.startTime?`${row.startTime} – ${row.endTime}`:row.phone??''}</span><span className="text-right text-[color:var(--muted)]">{row.receivedAt||row.createdAt||row.date?formatDateTime(row.receivedAt??row.createdAt??row.date):''}</span></div>{resource==='vouchers'&&<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>edit(row)} className="button-secondary"><Pencil size={16}/>Sửa</button><button onClick={()=>remove(row)} className="button-secondary text-red-600"><Trash2 size={16}/>Xóa</button></div>}{['stock-receipts','reviews','attendance'].includes(resource)&&<button onClick={()=>act(row)} disabled={resource==='stock-receipts'&&row.status!=='DRAFT'} className="button-secondary mt-4 w-full">{resource==='stock-receipts'?<><Check size={17}/>Xác nhận nhập kho</>:resource==='reviews'?<><EyeOff size={17}/>{row.isHidden?'Hiện đánh giá':'Ẩn đánh giá'}</>:<><Wrench size={17}/>Hiệu chỉnh có audit</>}</button>}{resource==='wallet-requests'&&row.status==='PENDING'&&<div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>reviewWallet(row,false)} className="button-secondary">Từ chối</button><button onClick={()=>reviewWallet(row,true)} className="button-primary"><Check size={17}/>Duyệt</button></div>}</article>)}
        </div>
      ) : <EmptyState title="Chưa có dữ liệu" />}
    </div>
  );
}
