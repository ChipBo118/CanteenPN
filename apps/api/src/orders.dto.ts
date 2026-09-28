import {PaymentMethod} from '@prisma/client';
import {Type} from 'class-transformer';
import {ArrayMaxSize, ArrayMinSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min, ValidateNested} from 'class-validator';

export class OrderLineDto {
  @IsString() menuItemId!: string;
  @IsInt() @Min(1) @Max(20) quantity!: number;
  @IsOptional() @IsString() note?: string;
}

export class CreateOrderDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(30) @ValidateNested({each: true}) @Type(() => OrderLineDto)
  items!: OrderLineDto[];
  @IsString() pickupSlotId!: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsString() promotionCode?: string;
  @IsOptional() @IsString() note?: string;
}

export class TransitionOrderDto {
  @IsString() status!: string;
  @IsOptional() @IsString() note?: string;
}
