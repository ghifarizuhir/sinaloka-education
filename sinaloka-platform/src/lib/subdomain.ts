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

/**
 * Validate that a string is a safe hex color (e.g. #1a2b3c).
 * Prevents CSS injection via style attributes.
 *
 * NOTE: Currently unused in the frontend — subdomain pages use Sinaloka's
 * teal branding while no brand editor exists. Retained for future use when
 * institution-specific brand colors are re-enabled.
 */
export function isValidHexColor(color: string | null | undefined): boolean {
  return !!color && /^#[0-9a-fA-F]{6}$/.test(color);
}

/**
 * Returns the color only if it's a valid hex color, otherwise undefined.
 */
export function sanitizeBrandColor(color: string | null | undefined): string | undefined {
  return isValidHexColor(color) ? color! : undefined;
}

/**
 * Validate that a URL is safe to use in CSS url() or img src.
 * Only allows http(s) URLs and absolute paths.
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('https://') || url.startsWith('http://') || url.startsWith('/');
}

export function isReservedSubdomain(): boolean {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  if (parts.length === 3 && hostname.endsWith('.sinaloka.com')) {
    return RESERVED_SUBDOMAINS.includes(parts[0]);
  }
  return false;
}
