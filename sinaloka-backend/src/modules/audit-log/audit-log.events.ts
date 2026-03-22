export const AUDIT_EVENTS = {
  LOG: 'audit.log',
} as const;

export interface AuditLogEvent {
  institutionId: string | null;
  userId: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId: string | null;
  summary: string;
  changes: Record<string, { before: unknown; after: unknown }> | null;
  httpMethod: string;
  endpoint: string;
  statusCode: number;
  ipAddress: string | null;
  userAgent: string | null;
}
