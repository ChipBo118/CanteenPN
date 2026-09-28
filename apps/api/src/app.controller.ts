import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/auth.decorators';

@ApiTags('health')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Kiểm tra trạng thái API' })
  health() {
    return { status: 'ok', service: 'canteengo-api', storage: 'postgresql', realtime: 'redis' };
  }
}
