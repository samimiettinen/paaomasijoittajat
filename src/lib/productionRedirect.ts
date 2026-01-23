/**
 * Production redirect utility
 * Ensures users are always redirected to production URL after authentication
 * 
 * NOTE: We do NOT auto-redirect from preview environments because:
 * 1. Supabase sessions are domain-specific and won't transfer
 * 2. Preview environments are for testing
 * 
 * Instead, we show a warning to users in preview environments.
 */

const PRODUCTION_URL = 'https://paaomaomistajat.lovable.app';

/**
 * Check if we're currently on the production domain
 */
export function isProductionDomain(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.origin === PRODUCTION_URL;
}

/**
 * Check if we're in a development/preview environment
 */
export function isPreviewEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return (
    hostname.includes('localhost') ||
    (hostname.includes('lovable.app') && !hostname.startsWith('paaomaomistajat')) ||
    hostname.includes('lovableproject.com')
  );
}

/**
 * Get the production URL for a given path
 */
export function getProductionUrl(path: string = '/'): string {
  return `${PRODUCTION_URL}${path}`;
}

/**
 * Check if user should be warned about being in preview environment
 * Returns true if in preview, false if in production
 */
export function shouldWarnAboutPreview(): boolean {
  return isPreviewEnvironment();
}
