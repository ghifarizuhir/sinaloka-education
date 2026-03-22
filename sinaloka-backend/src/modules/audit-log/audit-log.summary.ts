const RESOURCE_IDENTIFIERS: Record<string, string[]> = {
  student: ['name'],
  user: ['name', 'email'],
  tutor: ['name', 'email'],
  parent: ['name', 'email'],
  class: ['name'],
  session: ['title'],
  payment: ['invoice_number'],
  subject: ['name'],
  institution: ['name'],
  enrollment: ['id'],
  attendance: ['id'],
  expense: ['description'],
  settlement: ['id'],
  payout: ['id'],
  registration: ['name'],
  subscription: ['id'],
  subscription_payment: ['id'],
  whatsapp_template: ['name'],
};

export function buildSummary(
  action: string,
  resourceType: string,
  beforeState: Record<string, unknown> | null,
  requestBody: Record<string, unknown> | null,
  resourceId: string | null,
): string {
  const identifierFields = RESOURCE_IDENTIFIERS[resourceType] ?? ['id'];
  let identifier = resourceId ?? 'unknown';

  const source = beforeState ?? requestBody;
  if (source) {
    for (const field of identifierFields) {
      if (source[field] && typeof source[field] === 'string') {
        identifier = source[field] as string;
        break;
      }
    }
  }

  const actionVerb =
    action === 'CREATE' ? 'Created' :
    action === 'UPDATE' ? 'Updated' :
    action === 'DELETE' ? 'Deleted' : action;

  return `${actionVerb} ${resourceType} ${identifier}`;
}
