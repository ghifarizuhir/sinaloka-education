import {
  Controller,
  Post,
  Get,
  Body,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { LoginSchema, RefreshTokenSchema, LogoutSchema, ParentRegisterSchema } from './auth.dto.js';
import type { LoginDto, RefreshTokenDto, LogoutDto, ParentRegisterDto } from './auth.dto.js';
import { ParentInviteService } from '../parent/parent-invite.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly parentInviteService: ParentInviteService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LoginSchema))
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(RefreshTokenSchema))
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  @Public()
  @Post('register/parent')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(ParentRegisterSchema))
  async registerParent(@Body() dto: ParentRegisterDto) {
    const { user } = await this.parentInviteService.registerParent(dto);
    // Auto-login: return tokens
    return this.authService.login({
      email: user.email,
      password: dto.password,
    });
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ZodValidationPipe(LogoutSchema))
  async logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Get('me')
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.getProfile(user.userId);
  }
}
