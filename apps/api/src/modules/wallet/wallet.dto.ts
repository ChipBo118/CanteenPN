import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Max, MaxLength, Min } from 'class-validator';
export class TopUpDto { @ApiProperty({ enum: [50000, 100000, 200000, 500000] }) @IsInt() @IsIn([50000, 100000, 200000, 500000]) amount!: number; }

export class DepositDto {
  @ApiProperty({ minimum: 10000, maximum: 50000000 }) @IsInt() @Min(10000) @Max(50000000) amount!: number;
  @ApiProperty({ enum: ['QR', 'CASH'] }) @IsIn(['QR', 'CASH']) method!: 'QR' | 'CASH';
  @IsOptional() @IsString() @MaxLength(250) note?: string;
}

export class WithdrawDto {
  @ApiProperty({ minimum: 20000, maximum: 50000000 }) @IsInt() @Min(20000) @Max(50000000) amount!: number;
  @IsOptional() @IsString() @MaxLength(250) note?: string;
}

export class LinkBankDto {
  @IsString() @Length(2, 80) bankName!: string;
  @IsString() @Length(6, 30) accountNumber!: string;
  @IsString() @Length(2, 100) accountName!: string;
}

