import {Transform} from 'class-transformer';
import {IsOptional, IsString, Matches, MinLength} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MinLength(2) fullName?: string;
  @IsOptional() @Transform(({value}) => typeof value === 'string' ? value.replace(/[\s.-]/g, '').replace(/^\+84/, '0') : value)
  @Matches(/^0\d{9}$/, {message: 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.'}) phone?: string;
  @IsOptional() @IsString() className?: string;
}
