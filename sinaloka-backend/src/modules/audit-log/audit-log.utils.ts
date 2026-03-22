const SENSITIVE_FIELDS = [
  'password',
  'password_hash',
  'token',
  'refresh_token',
  'secret',
  'api_key',
  'reset_token',
  'invitation_token',
];

export function redactSensitiveFields(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f))) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = value;
    }
  }
  return result;
}

export interface FieldDiff {
  before: unknown;
  after: unknown;
}

export function computeDiff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): Record<string, FieldDiff> | null {
  const redactedBefore = redactSensitiveFields(before);
  const redactedAfter = redactSensitiveFields(after);
  const diff: Record<string, FieldDiff> = {};

  const allKeys = new Set([
    ...Object.keys(redactedBefore),
    ...Object.keys(redactedAfter),
  ]);

  const commonKeys = [...allKeys].filter(
    key => key in redactedBefore && key in redactedAfter
  );

  for (const key of commonKeys) {
    if (['updated_at', 'created_at'].includes(key)) continue;

    const beforeVal = redactedBefore[key];
    const afterVal = redactedAfter[key];

    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      diff[key] = { before: beforeVal, after: afterVal };
    }
  }

  return Object.keys(diff).length > 0 ? diff : null;
}

export function buildCreateChanges(
  data: Record<string, unknown>,
): Record<string, FieldDiff> {
  const redacted = redactSensitiveFields(data);
  const changes: Record<string, FieldDiff> = {};
  for (const [key, value] of Object.entries(redacted)) {
    if (['updated_at', 'created_at', 'id'].includes(key)) continue;
    changes[key] = { before: null, after: value };
  }
  return changes;
}

export function buildDeleteChanges(
  data: Record<string, unknown>,
): Record<string, FieldDiff> {
  const redacted = redactSensitiveFields(data);
  const changes: Record<string, FieldDiff> = {};
  for (const [key, value] of Object.entries(redacted)) {
    if (['updated_at', 'created_at', 'id'].includes(key)) continue;
    changes[key] = { before: value, after: null };
  }
  return changes;
}
