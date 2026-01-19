import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [adminLevel, setAdminLevel] = useState<AdminLevel>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const isAdmin = adminLevel === 'super' || adminLevel === 'regular';
  const isSuperAdmin = adminLevel === 'super';
  const isVibeCoder = adminLevel === 'vibe_coder';

  // Track login visit
  const trackVisit = async (currentMemberId: string) => {
    try {
      await supabase.from('member_visits').insert({
        member_id: currentMemberId,
        user_agent: navigator.userAgent,
      });
    } catch (error) {
      console.error('Failed to track visit:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Check if user is an admin by matching email to members table
          const { data: member } = await supabase
            .from('members')
            .select('id, is_admin')
            .eq('email', session.user.email)
            .maybeSingle();
          
          if (member) {
            setMemberId(member.id);
            
            // Track visit on login
            if (event === 'SIGNED_IN') {
              trackVisit(member.id);
            }
            
            // Check admin level from admins table
            const { data: adminRecord } = await supabase
              .from('admins')
              .select('admin_level')
              .eq('member_id', member.id)
              .maybeSingle();
            
            if (adminRecord) {
              setAdminLevel(adminRecord.admin_level as AdminLevel);
            } else if (member.is_admin) {
              // Fallback for legacy is_admin flag
              setAdminLevel('regular');
            } else {
              setAdminLevel(null);
            }
          } else {
            setMemberId(null);
            setAdminLevel(null);
          }
        } else {
          setMemberId(null);
          setAdminLevel(null);
        }
        
        setIsLoading(false);
      }
    );

    // Then get the initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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