import { IsString, Length } from 'class-validator';

export class ValidateVoucherDto {
  @IsString()
  @Length(4, 40)
  serialCode!: string;
}
