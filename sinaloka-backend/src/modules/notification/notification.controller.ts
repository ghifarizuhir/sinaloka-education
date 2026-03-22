import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { NotificationService } from './notification.service.js';
import { NotificationGateway } from './notification.gateway.js';
import { ListNotificationsDto } from './dto/notification.dto.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { InstitutionId } from '../../common/decorators/institution-id.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';

@Controller('notifications')
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private notificationService: NotificationService,
    private notificationGateway: NotificationGateway,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  findAll(
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
    @Query() dto: ListNotificationsDto,
  ) {
    return this.notificationService.findAll(institutionId, user.userId, dto);
  }

  @Get('unread-count')
  @Roles('ADMIN', 'SUPER_ADMIN')
  getUnreadCount(
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.getUnreadCount(institutionId, user.userId);
  }

  @Public()
  @Get('stream')
  async stream(
    @Query('token') token: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!token) {
      throw new UnauthorizedException('Token required');
    }

    let payload: { sub: string; institutionId: string; role: string };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    if (!payload.institutionId) {
      throw new UnauthorizedException('Institution context required');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    this.notificationGateway.addClient(payload.institutionId, payload.sub, res);

    const heartbeat = setInterval(() => {
      try {
        res.write(`: heartbeat\n\n`);
      } catch {
        clearInterval(heartbeat);
      }
    }, 30000);

    req.on('close', () => {
      clearInterval(heartbeat);
    });
  }

  @Patch(':id/read')
  @Roles('ADMIN', 'SUPER_ADMIN')
  markAsRead(@Param('id') id: string, @InstitutionId() institutionId: string) {
    return this.notificationService.markAsRead(id, institutionId);
  }

  @Patch('read-all')
  @Roles('ADMIN', 'SUPER_ADMIN')
  markAllAsRead(
    @InstitutionId() institutionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.markAllAsRead(institutionId, user.userId);
  }
}
