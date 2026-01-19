import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

  const isAdmin = adminLevel === 'super' || adminLevel === 'regular';
  const isSuperAdmin = adminLevel === 'super';
  const isVibeCoder = adminLevel === 'vibe_coder';

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

  // Fetch member and admin data with caching
  const fetchUserData = useCallback(async (email: string, isSignIn: boolean) => {
    // Check cache first
    const cached = getCachedData(email);
    if (cached && !isSignIn) {
      setMemberId(cached.memberId);
      setAdminLevel(cached.adminLevel);
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
    } catch (error) {
      console.error('Failed to fetch user data:', error);
      setMemberId(null);
      setAdminLevel(null);
    }
  }, [trackVisit]);

  useEffect(() => {
    let loadingTimer: NodeJS.Timeout;
    
    // Safety timeout to prevent infinite loading
    loadingTimer = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth loading timeout reached');
        setIsLoading(false);
      }
    }, LOADING_TIMEOUT);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user?.email) {
          await fetchUserData(session.user.email, event === 'SIGNED_IN');
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

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user?.email) {
        // Use cached data immediately if available
        const cached = getCachedData(session.user.email);
        if (cached) {
          setMemberId(cached.memberId);
          setAdminLevel(cached.adminLevel);
          setIsLoading(false);
        }
      } else {
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
      signOut 
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