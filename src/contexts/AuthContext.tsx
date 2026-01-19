import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type AdminLevel = 'super' | 'regular' | 'vibe_coder' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  permissionsLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isVibeCoder: boolean;
  adminLevel: AdminLevel;
  memberId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshPermissions: () => Promise<void>;
}

interface CachedAuthData {
  memberId: string | null;
  adminLevel: AdminLevel;
  email: string;
  timestamp: number;
}

const AUTH_CACHE_KEY = 'auth_member_data';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const LOADING_TIMEOUT = 3000; // 3 seconds max loading
const DB_QUERY_TIMEOUT = 5000; // 5 seconds max for DB queries
const DEBUG_AUTH = true; // Enable auth performance logging

// Performance logging helper
const authLog = (message: string, startTime?: number) => {
  if (!DEBUG_AUTH) return;
  const elapsed = startTime ? ` (${Date.now() - startTime}ms)` : '';
  console.log(`[Auth]${elapsed} ${message}`);
};

// Timeout wrapper for database queries
const withTimeout = <T,>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => {
      authLog(`Query timeout after ${ms}ms`);
      resolve(fallback);
    }, ms))
  ]);
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Cache helpers
const getCachedData = (email: string): CachedAuthData | null => {
  try {
    const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!cached) return null;
    
    const data: CachedAuthData = JSON.parse(cached);
    const isValid = data.email === email && (Date.now() - data.timestamp) < CACHE_DURATION;
    return isValid ? data : null;
  } catch {
    return null;
  }
};

const setCachedData = (email: string, memberId: string | null, adminLevel: AdminLevel) => {
  try {
    const data: CachedAuthData = { email, memberId, adminLevel, timestamp: Date.now() };
    sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
};

const clearCachedData = () => {
  try {
    sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // Ignore storage errors
  }
};

// Track if signIn() initiated a login - onAuthStateChange should skip fetching for this
let signInInProgress = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [adminLevel, setAdminLevel] = useState<AdminLevel>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const isAdmin = adminLevel === 'super' || adminLevel === 'regular';
  const isSuperAdmin = adminLevel === 'super';
  const isVibeCoder = adminLevel === 'vibe_coder';

  // Prefetch dashboard data in parallel
  const prefetchDashboardData = useCallback(() => {
    // Prefetch members
    queryClient.prefetchQuery({
      queryKey: ['members'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('members')
          .select('*')
          .order('last_name');
        if (error) throw error;
        return data;
      },
      staleTime: 30000,
    });

    // Prefetch events
    queryClient.prefetchQuery({
      queryKey: ['events'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .order('event_date', { ascending: false });
        if (error) throw error;
        return data;
      },
      staleTime: 30000,
    });

    // Prefetch visit count
    queryClient.prefetchQuery({
      queryKey: ['total-visits'],
      queryFn: async () => {
        const { count, error } = await supabase
          .from('member_visits')
          .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count || 0;
      },
      staleTime: 30000,
    });
  }, [queryClient]);

  // Track login visit (fire and forget)
  const trackVisit = useCallback(async (currentMemberId: string) => {
    try {
      await supabase.from('member_visits').insert({
        member_id: currentMemberId,
        user_agent: navigator.userAgent,
      });
    } catch {
      // Ignore tracking errors
    }
  }, []);

  // Background verification to update stale cache
  const verifyAndRefreshCache = useCallback(async (email: string, cached: CachedAuthData) => {
    const verifyStart = Date.now();
    authLog('Background verify started');
    setPermissionsLoading(true);
    try {
      const { data: member } = await supabase
        .from('members')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      authLog('Background verify: members query done', verifyStart);

      if (!member) {
        if (cached.memberId !== null) {
          clearCachedData();
          setMemberId(null);
          setAdminLevel(null);
        }
        setPermissionsLoading(false);
        return;
      }

      const { data: adminRecord } = await supabase
        .from('admins')
        .select('admin_level')
        .eq('member_id', member.id)
        .maybeSingle();
      authLog('Background verify: admins query done', verifyStart);

      const newLevel: AdminLevel = adminRecord?.admin_level as AdminLevel ?? null;

      // Update if different from cache
      if (cached.adminLevel !== newLevel || cached.memberId !== member.id) {
        authLog(`Background verify: updating cache (${cached.adminLevel} -> ${newLevel})`);
        setMemberId(member.id);
        setAdminLevel(newLevel);
        setCachedData(email, member.id, newLevel);
      }
      authLog('Background verify complete', verifyStart);
    } catch (err) {
      authLog(`Background verify error: ${err}`);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  // Fetch member and admin data with caching
  const fetchUserData = useCallback(async (email: string, isSignIn: boolean, forceRefresh = false) => {
    const fetchStart = Date.now();
    authLog(`fetchUserData called (isSignIn=${isSignIn}, forceRefresh=${forceRefresh})`);
    setPermissionsLoading(true);
    
    // Check cache first (skip if forceRefresh or signing in)
    const cached = getCachedData(email);
    if (cached && !isSignIn && !forceRefresh) {
      authLog('Using cached data - instant', fetchStart);
      setMemberId(cached.memberId);
      setAdminLevel(cached.adminLevel);
      // Run background verification (await to keep permissionsLoading accurate)
      await verifyAndRefreshCache(email, cached);
      return;
    }

    authLog('No cache - fetching from DB');
    try {
      // Fetch member data with timeout
      const memberQuery = async () => {
        return supabase.from('members').select('id, is_admin').eq('email', email).maybeSingle();
      };
      const memberResult = await withTimeout(
        memberQuery(),
        DB_QUERY_TIMEOUT,
        { data: null, error: null, count: null, status: 408, statusText: 'Timeout' }
      );
      const member = memberResult.data;
      authLog('Members query complete', fetchStart);

      if (!member) {
        setMemberId(null);
        setAdminLevel(null);
        setCachedData(email, null, null);
        setPermissionsLoading(false);
        return;
      }

      setMemberId(member.id);

      // Track visit on sign in (fire and forget - don't await)
      if (isSignIn) {
        trackVisit(member.id);
      }

      // Fetch admin level with timeout
      const adminQuery = async () => {
        return supabase.from('admins').select('admin_level').eq('member_id', member.id).maybeSingle();
      };
      const adminResult = await withTimeout(
        adminQuery(),
        DB_QUERY_TIMEOUT,
        { data: null, error: null, count: null, status: 408, statusText: 'Timeout' }
      );
      const adminRecord = adminResult.data;
      authLog('Admins query complete', fetchStart);

      let level: AdminLevel = null;
      if (adminRecord) {
        level = adminRecord.admin_level as AdminLevel;
      } else if (member.is_admin) {
        level = 'regular';
      }

      setAdminLevel(level);
      setCachedData(email, member.id, level);
      authLog(`fetchUserData complete (level=${level})`, fetchStart);

      // Start prefetching dashboard data if user has access
      if (level === 'super' || level === 'regular') {
        prefetchDashboardData();
      }
    } catch (error) {
      authLog(`fetchUserData error: ${error}`, fetchStart);
      console.error('Failed to fetch user data:', error);
      setMemberId(null);
      setAdminLevel(null);
    } finally {
      setPermissionsLoading(false);
    }
  }, [trackVisit, prefetchDashboardData, verifyAndRefreshCache]);

  useEffect(() => {
    const mountTime = Date.now();
    authLog('AuthProvider mounted');
    
    let loadingTimer: NodeJS.Timeout;
    
    // Safety timeout to prevent infinite loading
    loadingTimer = setTimeout(() => {
      if (isLoading) {
        authLog('Loading timeout reached!', mountTime);
        console.warn('Auth loading timeout reached');
        setIsLoading(false);
      }
    }, LOADING_TIMEOUT);

    // Track if initial session was already handled
    let initialSessionHandled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        authLog(`onAuthStateChange: ${event}`, mountTime);
        
        // Skip if we already handled initial session
        if (event === 'INITIAL_SESSION' && initialSessionHandled) {
          authLog('Skipping INITIAL_SESSION - already handled via cache');
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.email) {
          // For SIGNED_IN triggered by signIn(), skip - signIn() handles it
          if (event === 'SIGNED_IN') {
            if (signInInProgress) {
              authLog('SIGNED_IN - skipping, signIn() handles data fetch');
            } else {
              // Direct sign-in (e.g., from token refresh or external)
              authLog('SIGNED_IN (external) - fetching data');
              await fetchUserData(session.user.email, true);
            }
          } else {
            // For other events (TOKEN_REFRESHED, etc.), try cache first
            const cached = getCachedData(session.user.email);
            if (cached) {
              authLog('Using cache in onAuthStateChange');
              setMemberId(cached.memberId);
              setAdminLevel(cached.adminLevel);
              verifyAndRefreshCache(session.user.email, cached);
            } else {
              authLog('No cache - fetching in onAuthStateChange');
              await fetchUserData(session.user.email, false);
            }
          }
        } else {
          setMemberId(null);
          setAdminLevel(null);
          if (event === 'SIGNED_OUT') {
            authLog('SIGNED_OUT - clearing cache');
            clearCachedData();
          }
        }

        authLog('Setting isLoading=false', mountTime);
        setIsLoading(false);
      }
    );

    // Get initial session - handle immediately if cached
    authLog('Calling getSession()');
    supabase.auth.getSession().then(({ data: { session } }) => {
      authLog(`getSession returned (hasSession=${!!session})`, mountTime);
      
      if (session?.user?.email) {
        const cached = getCachedData(session.user.email);
        authLog(`Cache check: ${cached ? 'HIT' : 'MISS'}`);
        
        if (cached) {
          // Use cache immediately - don't wait for onAuthStateChange
          initialSessionHandled = true;
          setSession(session);
          setUser(session.user);
          setMemberId(cached.memberId);
          setAdminLevel(cached.adminLevel);
          authLog('Loaded from cache - instant!', mountTime);
          setIsLoading(false);
          // Background verify
          verifyAndRefreshCache(session.user.email, cached);
        } else {
          authLog('No cache - waiting for onAuthStateChange');
        }
        // If no cache, let onAuthStateChange handle it
      } else {
        // No session - stop loading
        authLog('No session - redirecting to login', mountTime);
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimer);
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const signInStart = Date.now();
    authLog('signIn called');
    
    // Mark that we're handling the sign-in flow
    signInInProgress = true;
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      authLog(`signInWithPassword complete (error=${!!error})`, signInStart);
      
      if (error) {
        signInInProgress = false;
        return { error: error as Error | null };
      }
      
      // Set session/user immediately
      if (data.session) {
        setSession(data.session);
        setUser(data.user);
      }
      
      // Fetch user data before returning
      if (data.user?.email) {
        authLog('Fetching user data in signIn');
        await fetchUserData(data.user.email, true);
        authLog('signIn complete - ready to navigate', signInStart);
      }
      
      setIsLoading(false);
      return { error: null };
    } finally {
      // Always reset the flag
      signInInProgress = false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setAdminLevel(null);
    setMemberId(null);
  };

  // Manual refresh permissions function
  const refreshPermissions = useCallback(async () => {
    if (!user?.email) return;
    clearCachedData();
    await fetchUserData(user.email, false, true);
  }, [user?.email, fetchUserData]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      isLoading,
      permissionsLoading,
      isAdmin, 
      isSuperAdmin,
      isVibeCoder,
      adminLevel,
      memberId,
      signIn, 
      signOut,
      refreshPermissions
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}