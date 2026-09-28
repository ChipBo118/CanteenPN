import {BadRequestException} from '@nestjs/common';
import {describe,expect,it} from 'vitest';
import {DemoService} from './demo.service';
describe('DemoService',()=>{it('reserves stock and calculates price atomically',()=>{const s=new DemoService();const before=s.menu[0].stock;const o=s.createOrder({items:[{menuItemId:1,quantity:2}],pickupAt:'11:45',paymentMethod:'WALLET'});expect(o.total).toBe(70000);expect(s.menu[0].stock).toBe(before-2);expect(o.status).toBe('PLACED')});it('rejects quantities above stock',()=>{const s=new DemoService();expect(()=>s.createOrder({items:[{menuItemId:3,quantity:99}]})).toThrow(BadRequestException)});it('moves an order through staff states',()=>{const s=new DemoService();expect(s.transition('CG-2048','READY').status).toBe('READY')})});
