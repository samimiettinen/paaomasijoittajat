/**
 * Clears all Supabase authentication data from browser storage
 * This prevents stale sessions from causing login loops
 */
export function clearAllAuthData(projectId: string = 'hldocmfatteumaeaadgc') {
  const clearedKeys: { localStorage: string[]; sessionStorage: string[]; cookies: string[] } = {
    localStorage: [],
    sessionStorage: [],
    cookies: []
  };

  const authKeys = [
    `sb-${projectId}-auth-token`,
    `sb-${projectId}-auth-token-code-verifier`,
    'auth_member_data',
    'remember_me_enabled',
    'remember_me_preference'
  ];

  // Clear localStorage - known keys
  authKeys.forEach(key => {
    try {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        clearedKeys.localStorage.push(key);
      }
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
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      if (!clearedKeys.localStorage.includes(key)) {
        clearedKeys.localStorage.push(key);
      }
    });
  } catch (e) {
    // Ignore
  }

  // Clear sessionStorage - known keys
  authKeys.forEach(key => {
    try {
      if (sessionStorage.getItem(key) !== null) {
        sessionStorage.removeItem(key);
        clearedKeys.sessionStorage.push(key);
      }
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
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      if (!clearedKeys.sessionStorage.includes(key)) {
        clearedKeys.sessionStorage.push(key);
      }
    });
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
        clearedKeys.cookies.push(name);
      }
    });
  } catch (e) {
    // Ignore cookie errors
  }

  // Debug logging
  const totalCleared = clearedKeys.localStorage.length + clearedKeys.sessionStorage.length + clearedKeys.cookies.length;
  
  if (totalCleared > 0) {
    console.log('[Auth] Session data cleared:');
    if (clearedKeys.localStorage.length > 0) {
      console.log('  📦 localStorage:', clearedKeys.localStorage);
    }
    if (clearedKeys.sessionStorage.length > 0) {
      console.log('  📦 sessionStorage:', clearedKeys.sessionStorage);
    }
    if (clearedKeys.cookies.length > 0) {
      console.log('  🍪 cookies:', clearedKeys.cookies);
    }
    console.log(`  ✅ Total keys cleared: ${totalCleared}`);
  } else {
    console.log('[Auth] No stale auth data found to clear');
  }

  return clearedKeys;
}
