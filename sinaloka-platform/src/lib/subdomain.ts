const RESERVED_SUBDOMAINS = [
  'platform',
  'parent',
  'tutors',
  'api',
  'www',
  'mail',
  'ftp',
  'admin',
  'app',
  'dashboard',
];

/**
 * Extract institution slug from the current hostname.
 * Returns null if on a reserved subdomain, localhost, or IP address.
 */
export function getInstitutionSlug(): string | null {
  const hostname = window.location.hostname;

  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null;
  }

  if (hostname.endsWith('.localhost')) {
    const slug = hostname.replace('.localhost', '');
    return RESERVED_SUBDOMAINS.includes(slug) ? null : slug;
  }

  const parts = hostname.split('.');
  if (parts.length === 3 && hostname.endsWith('.sinaloka.com')) {
    const slug = parts[0];
    return RESERVED_SUBDOMAINS.includes(slug) ? null : slug;
  }

  return null;
}

export function isReservedSubdomain(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length === 3 && hostname.endsWith('.sinaloka.com')) {
    return RESERVED_SUBDOMAINS.includes(parts[0]);
  }
  return false;
}
