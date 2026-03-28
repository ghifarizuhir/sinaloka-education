import 'reflect-metadata';

jest.mock('./auth.service', () => ({ AuthService: jest.fn() }));
jest.mock('../parent/parent-invite.service', () => ({
  ParentInviteService: jest.fn(),
}));
jest.mock('../../common/guards/rate-limit.guard', () => ({
  RateLimitGuard: jest.fn(),
  RateLimit: jest.fn(() => () => {}),
}));
jest.mock('../../common/pipes/zod-validation.pipe', () => ({
  ZodValidationPipe: jest.fn(),
}));
jest.mock('../audit-log/decorators/no-audit-log.decorator', () => ({
  NoAuditLog: jest.fn(() => () => {}),
}));

import { AuthController } from './auth.controller.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';

describe('AuthController — @Public() decorators', () => {
  it('logout method should be decorated with @Public()', () => {
    const isPublic = Reflect.getMetadata(
      IS_PUBLIC_KEY,
      AuthController.prototype.logout,
    );
    expect(isPublic).toBe(true);
  });
});
