export const TEMPLATE_VARIABLES: Record<string, string[]> = {
  payment_reminder: [
    'student_name',
    'institution_name',
    'amount',
    'due_date',
    'status',
    'checkout_url',
  ],
};

export const DEFAULT_TEMPLATES: Record<string, string> = {
  payment_reminder:
    "Assalamu'alaikum, Bapak/Ibu wali dari *{{student_name}}*.\n\n" +
    'Ini adalah pengingat pembayaran dari *{{institution_name}}*:\n' +
    '💰 Jumlah: Rp {{amount}}\n' +
    '📅 Jatuh tempo: {{due_date}}\n' +
    '📋 Status: {{status}}\n\n' +
    'Mohon segera melakukan pembayaran. Terima kasih.\n\n' +
    '{{checkout_url}}',
};

export const SAMPLE_DATA: Record<string, Record<string, string>> = {
  payment_reminder: {
    student_name: 'Ahmad Rizki',
    institution_name: 'Bimbel Cerdas',
    amount: '500.000',
    due_date: '25 Mar 2026',
    status: 'Menunggu',
    checkout_url: '📱 Bayar langsung: https://pay.sinaloka.com/abc123',
  },
};

/**
 * Interpolate template body with variables.
 * Unknown variables resolve to empty string.
 * Lines that become empty after interpolation are removed.
 */
export function interpolateTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  let result = body.replace(/\{\{(\w+)\}\}/g, (_, key) => variables[key] ?? '');
  // Remove lines that are now empty after interpolation
  result = result.replace(/^\s*\n/gm, '');
  return result.trim();
}
