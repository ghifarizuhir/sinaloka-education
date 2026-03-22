import { SetMetadata } from '@nestjs/common';

export const NO_AUDIT_LOG_KEY = 'no_audit_log';
export const NoAuditLog = () => SetMetadata(NO_AUDIT_LOG_KEY, true);
