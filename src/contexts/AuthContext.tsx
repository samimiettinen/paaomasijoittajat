import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

type AdminLevel = 'super' | 'regular' | 'vibe_coder' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  // Background verification to update stale cache (non-blocking)
  const verifyAndRefreshCache = useCallback((email: string, cached: CachedAuthData) => {
    // Use setTimeout to make this truly non-blocking
    setTimeout(async () => {
      try {
        const { data: member } = await supabase
          .from('members')
          .select('id')
          .eq('email', email)
          .maybeSingle();

        if (!member) {
          if (cached.memberId !== null) {
            clearCachedData();
            setMemberId(null);
            setAdminLevel(null);
          }
          return;
        }

        const { data: adminRecord } = await supabase
          .from('admins')
          .select('admin_level')
          .eq('member_id', member.id)
          .maybeSingle();

        const newLevel: AdminLevel = adminRecord?.admin_level as AdminLevel ?? null;

        // Update if different from cache
        if (cached.adminLevel !== newLevel || cached.memberId !== member.id) {
          setMemberId(member.id);
          setAdminLevel(newLevel);
          setCachedData(email, member.id, newLevel);
        }
      } catch {
        // Ignore verification errors
      }
    }, 100); // Small delay to not block initial render
  }, []);

  // Fetch member and admin data with caching
  const fetchUserData = useCallback(async (email: string, isSignIn: boolean, forceRefresh = false) => {
    // Check cache first (skip if forceRefresh or signing in)
    const cached = getCachedData(email);
    if (cached && !isSignIn && !forceRefresh) {
      setMemberId(cached.memberId);
      setAdminLevel(cached.adminLevel);
      // Defer background verification to not block
      verifyAndRefreshCache(email, cached);
      return;
    }

    try {
      // Fetch member data
      const { data: member } = await supabase
        .from('members')
        .select('id, is_admin')
        .eq('email', email)
        .maybeSingle();

      if (!member) {
        setMemberId(null);
        setAdminLevel(null);
        setCachedData(email, null, null);
        return;
      }

      setMemberId(member.id);

      // Track visit on sign in
      if (isSignIn) {
        trackVisit(member.id);
      }

      // Fetch admin level
      const { data: adminRecord } = await supabase
        .from('admins')
        .select('admin_level')
        .eq('member_id', member.id)
        .maybeSingle();

      let level: AdminLevel = null;
      if (adminRecord) {
        level = adminRecord.admin_level as AdminLevel;
      } else if (member.is_admin) {
        level = 'regular';
      }

      setAdminLevel(level);
      setCachedData(email, member.id, level);

      // Start prefetching dashboard data if user has access
      if (level === 'super' || level === 'regular') {
        prefetchDashboardData();
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setMemberId(null);
      setAdminLevel(null);
    }
  }, [trackVisit, prefetchDashboardData, verifyAndRefreshCache]);

  useEffect(() => {
    let loadingTimer: NodeJS.Timeout;
    
    // Safety timeout to prevent infinite loading
    loadingTimer = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth loading timeout reached');
        setIsLoading(false);
      }
    }, LOADING_TIMEOUT);

    // Track if initial session was already handled
    let initialSessionHandled = false;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Skip if we already handled initial session
        if (event === 'INITIAL_SESSION' && initialSessionHandled) {
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.email) {
          // For fresh sign-ins, always fetch from DB
          if (event === 'SIGNED_IN') {
            await fetchUserData(session.user.email, true);
          } else {
            // For other events, try cache first
            const cached = getCachedData(session.user.email);
            if (cached) {
              setMemberId(cached.memberId);
              setAdminLevel(cached.adminLevel);
              // Background verify (non-blocking)
              verifyAndRefreshCache(session.user.email, cached);
            } else {
              await fetchUserData(session.user.email, false);
            }
          }
        } else {
          setMemberId(null);
          setAdminLevel(null);
          if (event === 'SIGNED_OUT') {
            clearCachedData();
          }
        }

        setIsLoading(false);
      }
    );

    // Get initial session - handle immediately if cached
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        const cached = getCachedData(session.user.email);
        if (cached) {
          // Use cache immediately - don't wait for onAuthStateChange
          initialSessionHandled = true;
          setSession(session);
          setUser(session.user);
          setMemberId(cached.memberId);
          setAdminLevel(cached.adminLevel);
          setIsLoading(false);
          // Background verify
          verifyAndRefreshCache(session.user.email, cached);
        }
        // If no cache, let onAuthStateChange handle it
      } else {
        // No session - stop loading
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(loadingTimer);
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
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