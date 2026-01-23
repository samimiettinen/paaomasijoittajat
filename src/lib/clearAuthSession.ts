/**
 * Clears all Supabase authentication data from browser storage
 * This prevents stale sessions from causing login loops
 */
export function clearAllAuthData(projectId: string = 'hldocmfatteumaeaadgc') {
  const authKeys = [
    `sb-${projectId}-auth-token`,
    `sb-${projectId}-auth-token-code-verifier`,
    'auth_member_data',
    'remember_me_enabled',
    'remember_me_preference'
  ];

  // Clear localStorage
  authKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      // Ignore storage errors
    }
  });

  // Also clear any sb- prefixed keys we might have missed
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  } catch (e) {
    // Ignore
  }

  // Clear sessionStorage
  authKeys.forEach(key => {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      // Ignore storage errors
    }
  });

  // Also clear any sb- prefixed keys from sessionStorage
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
  } catch (e) {
    // Ignore
  }

  // Clear auth-related cookies
  try {
    document.cookie.split(';').forEach(cookie => {
      const name = cookie.split('=')[0].trim();
      if (name.startsWith('sb-') || name.includes('auth') || name.includes('supabase')) {
        // Clear for current path
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        // Clear for root path as well
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      }
    });
  } catch (e) {
    // Ignore cookie errors
  }

  console.log('[Auth] All auth data cleared from storage');
}
