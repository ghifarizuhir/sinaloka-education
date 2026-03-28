import { ResetPasswordSchema } from './auth.dto.js';
import { ParentRegisterSchema } from '../parent/parent.dto.js';

describe('Password validation schemas', () => {
  describe('ResetPasswordSchema', () => {
    it('should reject password without uppercase letter', () => {
      const result = ResetPasswordSchema.safeParse({
        token: 'abc',
        password: 'password1',
      });
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toContain('uppercase');
    });

    it('should reject password without digit', () => {
      const result = ResetPasswordSchema.safeParse({
        token: 'abc',
        password: 'PasswordOnly',
      });
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toContain('digit');
    });

    it('should accept password with uppercase and digit', () => {
      const result = ResetPasswordSchema.safeParse({
        token: 'abc',
        password: 'Password1',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ParentRegisterSchema', () => {
    it('should reject password without uppercase letter', () => {
      const result = ParentRegisterSchema.safeParse({
        token: 'invite-token',
        name: 'Parent Name',
        password: 'password1',
      });
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toContain('uppercase');
    });

    it('should reject password without digit', () => {
      const result = ParentRegisterSchema.safeParse({
        token: 'invite-token',
        name: 'Parent Name',
        password: 'PasswordOnly',
      });
      expect(result.success).toBe(false);
      expect(JSON.stringify(result)).toContain('digit');
    });

    it('should accept password with uppercase and digit', () => {
      const result = ParentRegisterSchema.safeParse({
        token: 'invite-token',
        name: 'Parent Name',
        password: 'Password1',
      });
      expect(result.success).toBe(true);
    });
  });
});
