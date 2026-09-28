import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MinLength } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export class RegisterStudentDto {
  @ApiProperty({ example: '2373240001@hpn.edu.vn' })
  @IsEmail({}, { message: 'Email trường không hợp lệ.' })
  email!: string;

  @ApiProperty({ example: 'CanteenVWA@2026' })
  @IsString()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự.' })
  @Matches(PASSWORD_PATTERN, { message: 'Mật khẩu cần có chữ hoa, chữ thường và chữ số.' })
  password!: string;

  @ApiProperty({ example: 'CanteenVWA@2026' })
  @IsString()
  confirmPassword!: string;
}

export class LoginDto {
  @ApiProperty() @IsEmail() email!: string;
  @ApiProperty() @IsString() password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty() @IsEmail() email!: string;
}

export class ResetPasswordDto {
  @ApiProperty() @IsString() token!: string;
  @ApiProperty() @IsString() @MinLength(8) @Matches(PASSWORD_PATTERN) password!: string;
  @ApiProperty() @IsString() confirmPassword!: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() currentPassword!: string;
  @ApiProperty() @IsString() @MinLength(8) @Matches(PASSWORD_PATTERN) newPassword!: string;
  @ApiProperty() @IsString() confirmPassword!: string;
}
