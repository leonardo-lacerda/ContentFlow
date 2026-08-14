import {
  Controller,
  Get,
  Param,
  Req,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { timingSafeEqual } from 'crypto';

@ApiTags('Monitor')
@Controller('/monitor')
export class MonitorController {
  @Get('/queue/:name')
  async getMessagesGroup(@Param('name') name: string, @Req() req: Request) {
    const expected = process.env.MONITOR_TOKEN;
    if (!expected) {
      throw new NotFoundException();
    }

    const received = req.header('x-monitor-token') || '';
    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(received);
    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      throw new UnauthorizedException();
    }

    return {
      status: 'success',
      message: `Queue ${name} is healthy.`,
    };
  }
}
