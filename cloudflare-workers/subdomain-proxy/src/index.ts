/**
 * Sinaloka Subdomain Proxy Worker
 *
 * Handles wildcard route *.sinaloka.com/* and proxies institution subdomain
 * requests to the sinaloka-platform Cloudflare Pages project.
 *
 * Why a Worker?
 * Cloudflare Pages does NOT support wildcard custom domains (*.example.com).
 * This Worker catches wildcard requests and proxies them to the Pages .pages.dev origin.
 *
 * Routing priority concern:
 * Worker route *.sinaloka.com/* MAY intercept reserved subdomains (platform, parent,
 * tutors, api) even though they have their own DNS records. To handle this safely,
 * reserved subdomains are proxied to their correct Pages project origins.
 *
 * Flow:
 *   bimbelcerdas.sinaloka.com/login
 *     → Worker intercepts (wildcard route)
 *     → Proxies to sinaloka-platform.pages.dev/login
 *     → React app extracts "bimbelcerdas" from hostname
 *     → Renders branded login page
 */

// Maps each known subdomain to its correct Pages .pages.dev origin
const SUBDOMAIN_ORIGINS: Record<string, string> = {
	platform: 'https://sinaloka-platform.pages.dev',
	parent: 'https://sinaloka-parent.pages.dev',
	tutors: 'https://sinaloka-tutors.pages.dev',
};

// Subdomains that are NOT frontend apps — let Cloudflare handle them directly
// api → Railway backend, www/mail/ftp → other services
const PASSTHROUGH_SUBDOMAINS = new Set(['api', 'www', 'mail', 'ftp']);

// Institution subdomains are proxied to the platform Pages project
const DEFAULT_ORIGIN = 'https://sinaloka-platform.pages.dev';

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);
		const hostname = url.hostname;

		// Validate: must be exactly one subdomain level under sinaloka.com
		const parts = hostname.split('.');
		if (parts.length !== 3 || !hostname.endsWith('.sinaloka.com')) {
			return fetch(request);
		}

		const subdomain = parts[0];

		// Passthrough subdomains — these are not frontend apps
		// Return passthrough so Cloudflare resolves them normally (api → Railway, etc.)
		// Note: If the Worker route intercepts these despite specific DNS records,
		// returning fetch(request) may cause a loop. In that case, these subdomains
		// should be excluded from the Worker route in the Cloudflare dashboard.
		if (PASSTHROUGH_SUBDOMAINS.has(subdomain)) {
			return fetch(request);
		}

		// Determine the correct Pages origin
		const origin = SUBDOMAIN_ORIGINS[subdomain] ?? DEFAULT_ORIGIN;

		// Proxy the request to the Pages project
		const pagesUrl = new URL(url.pathname + url.search, origin);

		// Build headers — remove Host so Pages receives the correct host
		const headers = new Headers(request.headers);
		headers.set('Host', new URL(origin).hostname);
		headers.set('X-Forwarded-Host', hostname);

		const response = await fetch(pagesUrl.toString(), {
			method: request.method,
			headers,
			body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
			redirect: 'manual',
		});

		// Return response with proxy header
		const newResponse = new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers: new Headers(response.headers),
		});

		newResponse.headers.set('X-Proxied-By', 'sinaloka-subdomain-proxy');

		return newResponse;
	},
};
