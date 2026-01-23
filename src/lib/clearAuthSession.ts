/**
 * Clears all Supabase authentication data from browser storage
 * This prevents stale sessions from causing login loops
 */
export function clearAllAuthData(projectId: string = 'hldocmfatteumaeaadgc') {
  const clearedKeys: { localStorage: string[]; sessionStorage: string[]; cookies: string[]; indexedDB: string[] } = {
    localStorage: [],
    sessionStorage: [],
    cookies: [],
    indexedDB: []
  };

  const authKeys = [
    `sb-${projectId}-auth-token`,
    `sb-${projectId}-auth-token-code-verifier`,
    `sb-${projectId}-auth-callback`,
    'auth_member_data',
    'remember_me_enabled',
    'remember_me_preference',
    'supabase.auth.token',
    'supabase-auth-token'
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

  // Clear IndexedDB databases that Supabase might use
  try {
    if (typeof indexedDB !== 'undefined') {
      // Delete known Supabase IndexedDB databases
      const dbNames = [
        'supabase-auth-token',
        `sb-${projectId}-auth-token`,
        'supabase',
        'auth-token-storage'
      ];
      dbNames.forEach(name => {
        try {
          const request = indexedDB.deleteDatabase(name);
          request.onsuccess = () => {
            clearedKeys.indexedDB.push(name);
            console.log(`[Auth] IndexedDB deleted: ${name}`);
          };
          request.onerror = () => {
            // Database might not exist, ignore
          };
        } catch {
          // Ignore individual database errors
        }
      });
    }
  } catch (e) {
    // Ignore IndexedDB errors
  }

  // Debug logging
  const totalCleared = clearedKeys.localStorage.length + clearedKeys.sessionStorage.length + clearedKeys.cookies.length;

  if (totalCleared > 0) {
    console.log('[Auth] Session data cleared:');
    if (clearedKeys.localStorage.length > 0) {
      console.log('  localStorage:', clearedKeys.localStorage);
    }
    if (clearedKeys.sessionStorage.length > 0) {
      console.log('  sessionStorage:', clearedKeys.sessionStorage);
    }
    if (clearedKeys.cookies.length > 0) {
      console.log('  cookies:', clearedKeys.cookies);
    }
    console.log(`  Total keys cleared: ${totalCleared}`);
  } else {
    console.log('[Auth] No stale auth data found to clear');
  }

  return clearedKeys;
}

/**
 * Validates if the current session is actually working
 * Returns true if session is valid and usable
 */
export async function validateSession(supabaseClient: { auth: { getSession: () => Promise<{ data: { session: unknown } }> } }): Promise<boolean> {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) return false;

    // Check if session token is not expired by trying to get user
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${(session as { access_token: string }).access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Force complete session reset - clears everything and signs out
 */
export async function forceSessionReset(supabaseClient: { auth: { signOut: () => Promise<void> } }): Promise<void> {
  console.log('[Auth] Forcing complete session reset...');

  // Clear all auth data first
  clearAllAuthData();

  // Then sign out from Supabase
  try {
    await supabaseClient.auth.signOut();
  } catch {
    // Ignore sign out errors - we've already cleared local storage
  }

  console.log('[Auth] Session reset complete');
}
