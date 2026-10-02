import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { CurrentUser, Public } from '../../common/auth.decorators';
import type { AuthUser } from '../../common/auth-user';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterStudentDto, ResetPasswordDto } from './auth.dto';
import { resolve } from 'node:path';
import { storeImage } from '../../common/image-storage';

const COOKIE = 'canteengo_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  private setCookie(response: Response, token: string) {
    response.cookie(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/api/auth', maxAge: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30) * 86_400_000 });
  }

  @Public() @Post('register/student') @ApiOperation({ summary: 'Đăng ký bằng email trong StudentDirectory' })
  async register(@Body() dto: RegisterStudentDto, @Res({ passthrough: true }) response: Response) { const session = await this.auth.registerStudent(dto); this.setCookie(response, session.refreshToken); return { ...session, refreshToken: undefined }; }

  @Public() @HttpCode(200) @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) { const session = await this.auth.login(dto); this.setCookie(response, session.refreshToken); return { ...session, refreshToken: undefined }; }

  @Public() @HttpCode(200) @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) { const session = await this.auth.refresh(request.cookies?.[COOKIE] as string | undefined); this.setCookie(response, session.refreshToken); return { ...session, refreshToken: undefined }; }

  @Public() @HttpCode(200) @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) { const result = await this.auth.logout(request.cookies?.[COOKIE] as string | undefined); response.clearCookie(COOKIE, { path: '/api/auth' }); return result; }

  @Public() @Post('forgot-password')
  forgot(@Body() dto: ForgotPasswordDto) { return this.auth.forgotPassword(dto.email); }

  @Public() @Post('reset-password')
  reset(@Body() dto: ResetPasswordDto) { return this.auth.resetPassword(dto); }

  @ApiBearerAuth() @Post('change-password')
  change(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) { return this.auth.changePassword(user.sub, dto); }

  @ApiBearerAuth() @Get('me')
  me(@CurrentUser() user: AuthUser) { return this.auth.me(user.sub); }

  @ApiBearerAuth() @Post('profile/avatar') @UseInterceptors(FileInterceptor('avatar', { limits: { fileSize: 2 * 1024 * 1024, files: 1 } }))
  async avatar(@CurrentUser() user: AuthUser, @UploadedFile() file?: { buffer: Buffer; mimetype: string; size: number }) {
    if (!file || !['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP tối đa 2 MB.');
    const signatures = { 'image/jpeg': [0xff, 0xd8, 0xff], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/webp': [0x52, 0x49, 0x46, 0x46] } as const;
    if (!signatures[file.mimetype as keyof typeof signatures].every((byte, index) => file.buffer[index] === byte)) throw new BadRequestException('Nội dung tệp ảnh không hợp lệ.');
    const avatarUrl = await storeImage({
      buffer: file.buffer,
      mimetype: file.mimetype,
      folder: 'avatars',
      publicIdPrefix: user.sub,
      localDirectory: resolve(process.env.UPLOAD_DIR ?? './uploads', 'avatars'),
      localUrlPrefix: '/uploads/avatars',
    });
    return this.auth.updateAvatar(user.sub, avatarUrl);
  }
}

