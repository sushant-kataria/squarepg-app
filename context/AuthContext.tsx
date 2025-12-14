import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  email?: string;
  [key: string]: any;
}

export interface Session {
  user: User;
  access_token: string;
  [key: string]: any;
}

type UserRole = 'owner' | 'tenant';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  signIn: (email: string) => Promise<any>;
  verifyOtp: (email: string, token: string) => Promise<any>;
  signInAsTenant: (email: string) => Promise<void>;
  loginAsDemo: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Check for Supabase Auth redirect in URL hash immediately
  const isAuthRedirect = typeof window !== 'undefined' && window.location.hash && (
    window.location.hash.includes('access_token') || 
    window.location.hash.includes('type=signup') || 
    window.location.hash.includes('type=recovery') ||
    window.location.hash.includes('type=magiclink') ||
    window.location.hash.includes('error_description')
  );

  const [session, setSession] = useState<Session | null>(() => {
    const storedEmail = localStorage.getItem('pg_user_email');
    if (storedEmail === 'demo@squarepg.com') {
        return { 
            user: { id: 'demo-user', email: 'demo@squarepg.com' }, 
            access_token: 'demo-token' 
        } as Session;
    }
    return null;
  });

  const [role, setRole] = useState<UserRole>('owner');
  
  const [loading, setLoading] = useState(() => {
     const storedEmail = localStorage.getItem('pg_user_email');
     if (storedEmail === 'demo@squarepg.com') return false;
     if (isAuthRedirect) return true;
     return isSupabaseConfigured(); 
  });

  const isDemo = localStorage.getItem('pg_user_email') === 'demo@squarepg.com';

  // Fetch role from 'profiles' table
  const fetchUserRole = async (userId: string) => {
      try {
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', userId)
            .single();
          
          if (data && data.role) {
              setRole(data.role as UserRole);
              localStorage.setItem('pg_user_role', data.role);
          } else {
              // Fallback if profile doesn't exist yet (trigger latency)
              setRole('owner');
          }
      } catch (e) {
          console.error("Error fetching role:", e);
      }
  };

  useEffect(() => {
    if (isSupabaseConfigured()) {
      let mounted = true;

      const safetyTimeout = setTimeout(() => {
        if (mounted && loading && isAuthRedirect) {
            console.warn("Auth redirect timeout - forcing app load");
            setLoading(false);
        }
      }, 8000);

      (supabase.auth as any).getSession().then(({ data: { session: supabaseSession }, error }: any) => {
        if (!mounted) return;
        
        if (error) {
             console.error("Session check error:", error);
             if (error.message.includes('refresh_token_not_found') || error.message.includes('Invalid Refresh Token')) {
                 setSession(null);
                 setLoading(false);
             }
        }

        if (supabaseSession) {
             setSession(supabaseSession);
             fetchUserRole(supabaseSession.user.id);
             setLoading(false);
        } else {
             if (!isAuthRedirect && !isDemo) {
                setSession(null);
                setLoading(false);
             }
        }
      });

      const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((event: string, newSession: Session) => {
        if (!mounted) return;
        
        if (event === 'SIGNED_OUT') {
             setSession(null);
             setRole('owner');
             setLoading(false);
        } else if (newSession) {
             setSession(newSession);
             fetchUserRole(newSession.user.id);
             setLoading(false);
             clearTimeout(safetyTimeout);
        } else {
             if (!isAuthRedirect && !isDemo) {
                 setSession(null);
                 setLoading(false);
             }
        }
      });

      return () => {
        mounted = false;
        clearTimeout(safetyTimeout);
        subscription.unsubscribe();
      };
    } else {
      setLoading(false);
    }
  }, [isDemo, isAuthRedirect]);

  const signIn = async (email: string) => {
    if (isSupabaseConfigured()) {
       return await (supabase.auth as any).signInWithOtp({ 
         email,
         options: {
           emailRedirectTo: window.location.origin
         }
       });
    } else {
       return loginAsDemo('owner');
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    if (isSupabaseConfigured()) {
      const tryVerify = async (type: string) => {
        const { data, error } = await (supabase.auth as any).verifyOtp({ email, token, type });
        return { data, error };
      };

      let result = await tryVerify('email');

      if (result.error) {
         const signupResult = await tryVerify('signup');
         if (!signupResult.error) result = signupResult;
         else {
             const magicResult = await tryVerify('magiclink');
             if (!magicResult.error) result = magicResult;
         }
      }

      if (result.error) throw result.error;
      
      setSession(result.data.session);
      // Fetch role immediately after verify
      if (result.data.session?.user) {
          await fetchUserRole(result.data.session.user.id);
      }
      return result.data;
    }
    throw new Error('Supabase not configured');
  };

  const signInAsTenant = async (email: string) => {
     await loginAsDemo('tenant');
     if (email !== 'demo@squarepg.com') {
         localStorage.setItem('pg_user_email', email);
     }
  };

  const loginAsDemo = async (newRole: UserRole) => {
    const demoEmail = 'demo@squarepg.com';
    localStorage.setItem('pg_user_role', newRole);
    localStorage.setItem('pg_user_email', demoEmail);
    setRole(newRole);
    setSession({ 
      user: { id: 'demo-user', email: demoEmail }, 
      access_token: 'demo-token' 
    } as Session);
    setLoading(false);
  };

  const signOut = async () => {
    if (isSupabaseConfigured()) {
      await (supabase.auth as any).signOut();
    }
    localStorage.removeItem('pg_user_role');
    localStorage.removeItem('pg_user_email');
    setSession(null);
    setRole('owner');
    window.location.href = '/';
  };

  const value = {
    session,
    user: session?.user ?? null,
    role,
    loading,
    signIn,
    verifyOtp,
    signInAsTenant,
    loginAsDemo,
    signOut,
    isDemo
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};