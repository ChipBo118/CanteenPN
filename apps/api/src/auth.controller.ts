import {Body, Controller, Get, Post, Req, Res} from '@nestjs/common';
import {Request, Response} from 'express';
import {Public} from './auth.decorators';
import {LoginDto, RegisterDto, RequestOtpDto} from './auth.dto';
import {AuthService} from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public() @Post('otp') requestOtp(@Body() dto: RequestOtpDto) { return this.auth.requestOtp(dto); }

  @Public() @Post('register')
  async register(@Body() dto: RegisterDto, @Res({passthrough: true}) response: Response) {
    return this.attach(await this.auth.register(dto), response);
  }

  @Public() @Post('login')
  async login(@Body() dto: LoginDto, @Res({passthrough: true}) response: Response) {
    return this.attach(await this.auth.login(dto), response);
  }

  @Public() @Post('refresh')
  async refresh(@Req() request: Request, @Res({passthrough: true}) response: Response) {
    const result = await this.auth.refresh(request.cookies?.cg_refresh);
    response.cookie('cg_access', result.accessToken, accessCookie());
    return {user: result.user};
  }

  @Public() @Post('logout')
  async logout(@Req() request: Request, @Res({passthrough: true}) response: Response) {
    await this.auth.logout(request.cookies?.cg_refresh);
    response.clearCookie('cg_access');
    response.clearCookie('cg_refresh', {path: '/api/auth'});
    return {ok: true};
  }

  @Get('me') me(@Req() request: Request & {user: unknown}) { return request.user; }

  private attach(result: Awaited<ReturnType<AuthService['login']>>, response: Response) {
    response.cookie('cg_access', result.accessToken, accessCookie());
    response.cookie('cg_refresh', result.refreshToken, {...refreshCookie(), maxAge: 7 * 24 * 60 * 60_000});
    return {user: result.user};
  }
}

const secure = process.env.NODE_ENV === 'production';
const accessCookie = () => ({httpOnly: true, secure, sameSite: 'lax' as const, maxAge: 15 * 60_000, path: '/'});
const refreshCookie = () => ({httpOnly: true, secure, sameSite: 'lax' as const, path: '/api/auth'});
