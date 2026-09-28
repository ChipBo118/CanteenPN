import {Transform} from 'class-transformer';
import {IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength} from 'class-validator';

export class RequestOtpDto {
  @IsEmail() email!: string;
  @IsString() @MaxLength(20) @Matches(/^[A-Za-z0-9-]{4,20}$/, {message: 'MSSV chỉ gồm chữ, số hoặc dấu gạch ngang.'}) studentId!: string;
  @Transform(({value}) => typeof value === 'string' ? value.replace(/[\s.-]/g, '') : value)
  @Matches(/^(?:\+84|0)\d{9}$/, {message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0 hoặc +84.'}) phone!: string;
}

export class RegisterDto {
  @IsString() @MinLength(2) fullName!: string;
  @IsString() @MaxLength(20) @Matches(/^[A-Za-z0-9-]{4,20}$/, {message: 'MSSV chỉ gồm chữ, số hoặc dấu gạch ngang.'}) studentId!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsString() @Matches(/^\d{6}$/) otp!: string;
  @Transform(({value}) => typeof value === 'string' ? value.replace(/[\s.-]/g, '') : value)
  @Matches(/^(?:\+84|0)\d{9}$/, {message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0 hoặc +84.'}) phone!: string;
  @IsOptional() @IsString() className?: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(6) password!: string;
}
