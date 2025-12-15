import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserRole = 'owner' | 'tenant';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  isDemo: boolean;
  signIn: (email: string) => Promise<{ error: any }>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  loginAsDemo: (demoRole: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Check if user is in demo mode
 */
const isDemoMode = (): boolean => {
  const demoFlag = localStorage.getItem('pg_demo_mode');
  const demoEmail = localStorage.getItem('pg_user_email');
  return demoFlag === 'true' || 
         demoEmail === 'demo.owner@ashirwadpg.com' || 
         demoEmail === 'demo.tenant@ashirwadpg.com';
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole>('owner');
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    console.log('🔄 AuthProvider initializing...');
    initializeAuth();
  }, []);

  /**
   * Initialize authentication state
   */
  const initializeAuth = async () => {
    try {
      setLoading(true);

      // Check for demo mode FIRST
      if (isDemoMode()) {
        const demoRole = localStorage.getItem('pg_user_role') as UserRole || 'owner';
        const demoEmail = localStorage.getItem('pg_user_email');
        console.log('✅ Demo mode detected:', { role: demoRole, email: demoEmail });
        
        setIsDemo(true);
        setRole(demoRole);
        setSession(null); // No real session in demo mode
        setUser(null); // No real user in demo mode
        setLoading(false);
        return;
      }

      // CRITICAL: Check for recent tenant session in localStorage FIRST
      const storedRole = localStorage.getItem('pg_user_role');
      const storedEmail = localStorage.getItem('pg_user_email');
      const authTimestamp = localStorage.getItem('pg_auth_timestamp');
      
      if (storedRole === 'tenant' && storedEmail && authTimestamp) {
        // Validate timestamp (within 24 hours)
        const timeDiff = Date.now() - Number(authTimestamp);
        const isRecent = timeDiff < 24 * 60 * 60 * 1000; // 24 hours
        
        if (isRecent) {
          console.log('✅ Restoring recent tenant session from localStorage:', {
            email: storedEmail,
            role: storedRole,
            age: `${Math.floor(timeDiff / 60000)} minutes`
          });
          
          // Try to get session, but don't fail if not found
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            setSession(currentSession);
            setUser(currentSession.user);
          }
          
          setRole('tenant');
          setLoading(false);
          return;
        } else {
          console.log('⚠️ Stored tenant session expired, checking Supabase...');
        }
      }

      // Get current session from Supabase
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('❌ Error getting session:', sessionError);
        setLoading(false);
        return;
      }

      if (!currentSession) {
        console.log('ℹ️ No active session');
        setLoading(false);
        return;
      }

      console.log('✅ Session found:', currentSession.user.email);
      setSession(currentSession);
      setUser(currentSession.user);

      // Detect and set role
      const userRole = await detectUserRole(currentSession.user.email!, currentSession.user.id);
      console.log('✅ Role detected:', userRole);
      setRole(userRole);

      // Listen for auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          console.log('🔔 Auth state changed:', event);
          
          if (event === 'SIGNED_IN' && newSession) {
            console.log('✅ User signed in:', newSession.user.email);
            setSession(newSession);
            setUser(newSession.user);
            
            const newRole = await detectUserRole(newSession.user.email!, newSession.user.id);
            console.log('✅ New role:', newRole);
            setRole(newRole);
          } else if (event === 'SIGNED_OUT') {
            console.log('👋 User signed out');
            setSession(null);
            setUser(null);
            setRole('owner');
            setIsDemo(false);
            localStorage.clear();
          }
        }
      );

      setLoading(false);

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      setLoading(false);
    }
  };

  /**
   * Detect user role based on email and auth_user_id
   */
  const detectUserRole = async (userEmail: string, userId: string): Promise<UserRole> => {
    try {
      console.log('🔍 Detecting role for:', { userEmail, userId });

      // Check if demo mode
      if (isDemoMode()) {
        const demoRole = localStorage.getItem('pg_user_role') as UserRole || 'owner';
        console.log('✅ Demo mode - Role:', demoRole);
        return demoRole;
      }

      // CRITICAL: Check localStorage FIRST for recent tenant auth
      const storedRole = localStorage.getItem('pg_user_role');
      const storedEmail = localStorage.getItem('pg_user_email');
      const authTimestamp = localStorage.getItem('pg_auth_timestamp');
      
      // If tenant role was set within last 5 minutes AND email matches, TRUST IT
      if (storedRole === 'tenant' && authTimestamp && storedEmail?.toLowerCase() === userEmail?.toLowerCase()) {
        const timeDiff = Date.now() - Number(authTimestamp);
        if (timeDiff < 5 * 60 * 1000) { // 5 minutes
          console.log('✅ Recent tenant auth found in localStorage - Role: tenant');
          return 'tenant';
        }
      }

      // PRIORITY 1: Check by auth_user_id (most reliable)
      if (userId) {
        console.log('🔍 Checking tenants by auth_user_id:', userId);
        
        const { data: tenantByAuthId, error: authIdError } = await supabase
          .from('tenants')
          .select('id, email, name, auth_user_id')
          .eq('auth_user_id', userId)
          .maybeSingle();

        if (authIdError) {
          console.error('⚠️ Error checking by auth_user_id:', authIdError);
        }

        if (tenantByAuthId) {
          console.log('✅ Tenant found by auth_user_id - Role: tenant');
          localStorage.setItem('pg_user_role', 'tenant');
          localStorage.setItem('pg_user_email', tenantByAuthId.email);
          localStorage.setItem('pg_tenant_name', tenantByAuthId.name);
          localStorage.setItem('pg_tenant_id', String(tenantByAuthId.id));
          localStorage.setItem('pg_auth_timestamp', String(Date.now()));
          return 'tenant';
        }
      }

      // PRIORITY 2: Check tenants table by email
      if (userEmail) {
        console.log('🔍 Checking tenants by email:', userEmail);
        
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('id, email, name, auth_user_id')
          .eq('email', userEmail.toLowerCase().trim())
          .maybeSingle();

        if (tenantError) {
          console.error('⚠️ Error checking tenant by email:', tenantError);
        }

        if (tenantData) {
          console.log('✅ Tenant found by email - Role: tenant');
          localStorage.setItem('pg_user_role', 'tenant');
          localStorage.setItem('pg_user_email', tenantData.email);
          localStorage.setItem('pg_tenant_name', tenantData.name);
          localStorage.setItem('pg_tenant_id', String(tenantData.id));
          localStorage.setItem('pg_auth_timestamp', String(Date.now()));
          
          // Update auth_user_id if missing
          if (!tenantData.auth_user_id && userId) {
            console.log('🔄 Updating tenant with auth_user_id:', userId);
            await supabase
              .from('tenants')
              .update({ auth_user_id: userId })
              .eq('id', tenantData.id);
          }
          
          return 'tenant';
        }
      }

      // PRIORITY 3: Check invitations table
      if (userEmail) {
        console.log('🔍 Checking invitations table');
        
        const { data: invitationData } = await supabase
          .from('invitations')
          .select('is_accepted, tenant_email, tenant_id')
          .eq('tenant_email', userEmail.toLowerCase().trim())
          .eq('is_accepted', true)
          .maybeSingle();

        if (invitationData) {
          console.log('✅ Accepted invitation found - Role: tenant');
          localStorage.setItem('pg_user_role', 'tenant');
          localStorage.setItem('pg_user_email', userEmail.toLowerCase().trim());
          localStorage.setItem('pg_auth_timestamp', String(Date.now()));
          return 'tenant';
        }
      }

      // Default to owner if not found in tenants
      console.log('✅ User not in tenants - Role: owner');
      localStorage.setItem('pg_user_role', 'owner');
      if (userEmail) {
        localStorage.setItem('pg_user_email', userEmail);
      }
      return 'owner';

    } catch (error) {
      console.error('❌ Error detecting role:', error);
      // Default to owner on error (safer)
      localStorage.setItem('pg_user_role', 'owner');
      return 'owner';
    }
  };

  /**
   * Sign in with email (send OTP)
   */
  const signIn = async (email: string): Promise<{ error: any }> => {
    try {
      console.log('📧 Sending OTP to:', email);

      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        console.error('❌ Error sending OTP:', error);
        return { error };
      }

      console.log('✅ OTP sent successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { error };
    }
  };

  /**
   * Verify OTP and sign in
   */
  const verifyOtp = async (email: string, token: string): Promise<void> => {
    try {
      console.log('🔐 Verifying OTP for:', email);

      const { data, error } = await supabase.auth.verifyOtp({
        email: email.toLowerCase().trim(),
        token: token.trim(),
        type: 'email',
      });

      if (error) {
        console.error('❌ OTP verification error:', error);
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      console.log('✅ OTP verified successfully');

      // CRITICAL: Store email immediately
      localStorage.setItem('pg_user_email', email.toLowerCase().trim());

      // Detect and set role
      const userRole = await detectUserRole(email.toLowerCase().trim(), data.user.id);
      console.log('✅ Role set:', userRole);

      setSession(data.session);
      setUser(data.user);
      setRole(userRole);

    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      throw error;
    }
  };

  /**
   * Sign out
   */
  const signOut = async (): Promise<void> => {
    try {
      console.log('👋 Signing out...');

      // Only call Supabase signOut if not in demo mode
      if (!isDemoMode()) {
        await supabase.auth.signOut();
      }
      
      setSession(null);
      setUser(null);
      setRole('owner');
      setIsDemo(false);
      
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('✅ Signed out successfully');
      
      // Redirect to home page
      window.location.href = window.location.origin + '/#/';
      
    } catch (error) {
      console.error('❌ Sign out error:', error);
      // Still clear local storage on error
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = window.location.origin + '/#/';
    }
  };

  /**
   * Login as demo user - bypasses authentication
   */
  const loginAsDemo = async (demoRole: UserRole): Promise<void> => {
    try {
      console.log('🎭 Logging in as demo:', demoRole);

      // Clear existing session (but don't wait for it)
      supabase.auth.signOut().catch(() => {});

      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();

      // Set demo credentials
      if (demoRole === 'owner') {
        localStorage.setItem('pg_user_email', 'demo.owner@ashirwadpg.com');
      } else {
        localStorage.setItem('pg_user_email', 'demo.tenant@ashirwadpg.com');
        localStorage.setItem('pg_tenant_name', 'Demo Tenant');
      }
      
      localStorage.setItem('pg_user_role', demoRole);
      localStorage.setItem('pg_demo_mode', 'true');
      localStorage.setItem('pg_auth_timestamp', String(Date.now()));

      setIsDemo(true);
      setRole(demoRole);
      setSession(null); // No real session in demo mode
      setUser(null); // No real user in demo mode

      console.log('✅ Demo login successful:', {
        role: demoRole,
        email: localStorage.getItem('pg_user_email'),
        demoMode: localStorage.getItem('pg_demo_mode')
      });
      
    } catch (error) {
      console.error('❌ Demo login error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    session,
    user,
    role,
    loading,
    isDemo,
    signIn,
    verifyOtp,
    signOut,
    loginAsDemo,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
