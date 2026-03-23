import {
  computeDiff,
  buildCreateChanges,
  buildDeleteChanges,
  redactSensitiveFields,
} from './audit-log.utils.js';
import { buildSummary } from './audit-log.summary.js';

describe('AuditLog Utils', () => {
  describe('redactSensitiveFields', () => {
    it('should redact password fields', () => {
      const result = redactSensitiveFields({
        name: 'Budi',
        password_hash: 'abc123',
      });
      expect(result.name).toBe('Budi');
      expect(result.password_hash).toBe('[REDACTED]');
    });

    it('should redact token fields', () => {
      const result = redactSensitiveFields({
        email: 'a@b.com',
        refresh_token: 'xyz',
      });
      expect(result.refresh_token).toBe('[REDACTED]');
    });
  });

  describe('computeDiff', () => {
    it('should return changed fields only', () => {
      const before = { name: 'Budi', grade: '10', status: 'ACTIVE' };
      const after = { name: 'Budi Santoso', grade: '10', status: 'ACTIVE' };
      const diff = computeDiff(before, after);
      expect(diff).toEqual({ name: { before: 'Budi', after: 'Budi Santoso' } });
    });

    it('should return null when no changes', () => {
      const data = { name: 'Budi', grade: '10' };
      expect(computeDiff(data, data)).toBeNull();
    });

    it('should skip updated_at and created_at', () => {
      const before = { name: 'A', updated_at: '2026-01-01' };
      const after = { name: 'A', updated_at: '2026-01-02' };
      expect(computeDiff(before, after)).toBeNull();
    });
  });

  describe('buildCreateChanges', () => {
    it('should map all fields with null before', () => {
      const result = buildCreateChanges({ name: 'Budi', grade: '10' });
      expect(result.name).toEqual({ before: null, after: 'Budi' });
    });
  });

  describe('buildDeleteChanges', () => {
    it('should map all fields with null after', () => {
      const result = buildDeleteChanges({ name: 'Budi', grade: '10' });
      expect(result.name).toEqual({ before: 'Budi', after: null });
    });
  });

  describe('buildSummary', () => {
    it('should use before-state identifier', () => {
      const result = buildSummary(
        'UPDATE',
        'student',
        { name: 'Budi' },
        null,
        'abc',
      );
      expect(result).toBe('Updated student Budi');
    });

    it('should fall back to resource ID', () => {
      const result = buildSummary('DELETE', 'enrollment', null, null, 'abc123');
      expect(result).toBe('Deleted enrollment abc123');
    });

    it('should use request body for create', () => {
      const result = buildSummary(
        'CREATE',
        'student',
        null,
        { name: 'Budi' },
        null,
      );
      expect(result).toBe('Created student Budi');
    });
  });
});
