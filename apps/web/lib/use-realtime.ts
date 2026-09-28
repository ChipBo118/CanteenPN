'use client';
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from './api';
import { useAuthStore } from './auth-store';
export function useRealtime(events: string[], onEvent: (event:string,payload:unknown)=>void, orderId?: string){
  const token=useAuthStore(s=>s.accessToken);
  useEffect(()=>{
    if(!token)return;
    const socket=io(API_URL.replace(/\/api$/,''),{auth:{token},transports:['websocket']});
    const subscribe=()=>{if(orderId)socket.emit('order:subscribe',{orderId})};
    socket.on('connect',subscribe);
    for(const event of events)socket.on(event,(payload)=>onEvent(event,payload));
    return()=>{if(orderId)socket.emit('order:unsubscribe',{orderId});socket.disconnect()};
  },[token,events,onEvent,orderId]);
}
