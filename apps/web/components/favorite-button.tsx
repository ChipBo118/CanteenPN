'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { apiRequest, authHeaders } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

type FavoriteRecord={productId:string;product:{id:string;slug:string}};
type ProductIdentity={id:string;slug:string};

export function FavoriteButton({productId,slug,name,className='absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-xl bg-white/95 text-brand-900 shadow'}:{productId?:string;slug:string;name:string;className?:string}){
  const token=useAuthStore(state=>state.accessToken); const router=useRouter(); const queryClient=useQueryClient();
  const favorites=useQuery({queryKey:['favorites'],queryFn:()=>apiRequest<FavoriteRecord[]>('/favorites',{headers:authHeaders(token)}),enabled:!!token});
  const current=favorites.data?.find(item=>productId?item.productId===productId:item.product.slug===slug); const active=Boolean(current);
  const toggle=useMutation({mutationFn:async()=>{if(!token){router.push('/auth/login');return;}const id=productId??current?.productId??(await apiRequest<ProductIdentity>(`/products/${slug}`)).id;await apiRequest(`/favorites/${id}`,{method:active?'DELETE':'POST',headers:authHeaders(token)});},onSuccess:()=>{queryClient.invalidateQueries({queryKey:['favorites']});queryClient.invalidateQueries({queryKey:['student','favorites']});}});
  return <button type="button" onClick={event=>{event.preventDefault();event.stopPropagation();toggle.mutate();}} disabled={toggle.isPending} className={`${className} ${active?'text-red-500':'hover:text-red-500'} disabled:opacity-60`} aria-label={`${active?'Bỏ yêu thích':'Yêu thích'} ${name}`} aria-pressed={active} title={active?'Bỏ khỏi yêu thích':'Thêm vào yêu thích'}><Heart size={18} className={active?'fill-current':''}/></button>;
}
