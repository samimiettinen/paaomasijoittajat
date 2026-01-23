/**
 * Clears all Supabase authentication data from browser storage
 * This prevents stale sessions from causing login loops
 */
export function clearAllAuthData(projectId: string = 'hldocmfatteumaeaadgc') {
  const clearedKeys: string[] = [];

  const authKeys = [
    `sb-${projectId}-auth-token`,
    `sb-${projectId}-auth-token-code-verifier`,
    'auth_member_data',
    'remember_me_enabled',
    'remember_me_preference'
  ];

  // Clear localStorage
  authKeys.forEach(key => {
    if (localStorage.getItem(key) !== null) {
      localStorage.removeItem(key);
      clearedKeys.push(key);
    }
  });

  // Clear any sb- prefixed keys
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    if (!clearedKeys.includes(key)) {
      clearedKeys.push(key);
    }
  });

  // Clear sessionStorage
  authKeys.forEach(key => {
    if (sessionStorage.getItem(key) !== null) {
      sessionStorage.removeItem(key);
      clearedKeys.push(`session:${key}`);
    }
  });

  if (clearedKeys.length > 0) {
    console.log('[Auth] Cleared stale data:', clearedKeys);
  }

  return clearedKeys;
}

/**
 * Validates if the current session token is actually working
 */
export async function validateSession(supabaseUrl: string, supabaseKey: string, accessToken: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'apikey': supabaseKey,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
