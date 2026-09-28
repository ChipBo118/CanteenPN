import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
export type Status='PLACED'|'CONFIRMED'|'PREPARING'|'READY'|'COMPLETED'|'REJECTED'|'CANCELLED';
@Injectable() export class DemoService{
 menu=[{id:1,name:'Cơm tấm sườn bì',category:'Món chính',price:35000,stock:18},{id:2,name:'Phở gà thanh vị',category:'Món chính',price:32000,stock:12},{id:3,name:'Gỏi cuốn tôm thịt',category:'Món chay',price:24000,stock:8}];
 orders:any[]=[{id:'CG-2048',status:'PREPARING',total:67000,pickupAt:'11:45',createdAt:new Date()}];
 getMenu(){return this.menu} getOrders(){return this.orders}
 createOrder(body:any){if(!Array.isArray(body.items)||!body.items.length)throw new BadRequestException('Giỏ hàng trống');let total=0;for(const line of body.items){const food=this.menu.find(x=>x.id===line.menuItemId);if(!food||food.stock<line.quantity)throw new BadRequestException('Món không đủ số lượng');food.stock-=line.quantity;total+=food.price*line.quantity}const order={id:`CG-${2050+this.orders.length}`,status:'PLACED',total,pickupAt:body.pickupAt||'11:45',paymentMethod:body.paymentMethod||'WALLET',createdAt:new Date()};this.orders.unshift(order);return order}
 transition(id:string,status:Status){const order=this.orders.find(x=>x.id===id);if(!order)throw new NotFoundException();order.status=status;return order}
 cancel(id:string){const order=this.orders.find(x=>x.id===id);if(!order)throw new NotFoundException();if(Date.now()-new Date(order.createdAt).getTime()>300000)throw new BadRequestException('Đã quá thời gian hủy');order.status='CANCELLED';return order}
}
