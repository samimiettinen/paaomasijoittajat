/**
 * Production redirect utility
 * Ensures users are always redirected to production URL after authentication
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
    hostname.includes('lovable.app') && !hostname.startsWith('paaomaomistajat') ||
    hostname.includes('lovableproject.com')
  );
}

/**
 * Redirect to production after successful login if we're in a preview environment
 * @param targetPath - The path to navigate to after redirect (e.g., '/' or '/dashboard')
 * @returns true if redirect was initiated, false if already on production
 */
export function redirectToProduction(targetPath: string = '/'): boolean {
  if (isProductionDomain()) {
    console.log('[Redirect] Already on production domain');
    return false;
  }

  const productionTarget = `${PRODUCTION_URL}${targetPath}`;
  console.log('[Redirect] Redirecting to production:', productionTarget);
  
  // Use replace to prevent back-button issues
  window.location.replace(productionTarget);
  return true;
}

/**
 * Get the production URL for a given path
 */
export function getProductionUrl(path: string = '/'): string {
  return `${PRODUCTION_URL}${path}`;
}
