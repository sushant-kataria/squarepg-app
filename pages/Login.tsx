import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Hexagon, 
  Loader2, 
  Mail, 
  Info, 
  KeyRound, 
  ArrowLeft, 
  AlertTriangle, 
  PlayCircle, 
  User, 
  RefreshCw,
  CheckCircle,
  Home
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hasAcceptedInvitation } from '../lib/invitations';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isTenant, setIsTenant] = useState(false);
  
  const { signIn, verifyOtp, loading, session, role } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && session) {
      const currentRole = localStorage.getItem('pg_user_role') || role;
      console.log('🔄 Already logged in, redirecting...', { currentRole, role, session: !!session });
      
      if (currentRole === 'tenant') {
        navigate('/my-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [session, loading, role, navigate]);

  /**
   * Send OTP to email
   */
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const cleanEmail = email.toLowerCase().trim();
      const targetRole = isTenant ? 'tenant' : 'owner';
      
      console.log('📧 Starting login process:', { email: cleanEmail, role: targetRole });

      // CRITICAL: Clear ALL storage first
      localStorage.clear();
      sessionStorage.clear();
      
      // Set intended role and email IMMEDIATELY
      localStorage.setItem('pg_user_role', targetRole);
      localStorage.setItem('pg_user_email', cleanEmail);
      localStorage.setItem('pg_auth_timestamp', String(Date.now()));

      console.log('✅ Role and email stored:', { 
        role: localStorage.getItem('pg_user_role'),
        email: localStorage.getItem('pg_user_email')
      });

      // For tenants: verify they exist and have accepted invitation
      if (isTenant) {
        console.log('🔍 Verifying tenant account...');
        
        // Check if tenant exists
        const { data: tenantData, error: tenantError } = await supabase
          .from('tenants')
          .select('email, name, id, auth_user_id')
          .eq('email', cleanEmail)
          .maybeSingle();

        console.log('🔍 Tenant lookup result:', { tenantData, tenantError });

        if (tenantError) {
          console.error('❌ Error checking tenant:', tenantError);
          
          if (tenantError.code === 'PGRST116') {
            throw new Error(
              'No tenant account found with this email.\n\n' +
              'Please ensure:\n' +
              '• Your property owner has added you as a tenant\n' +
              '• You are using the correct email address\n\n' +
              'Contact your property owner for assistance.'
            );
          }
          
          throw new Error('Error verifying tenant account. Please try again.');
        }

        if (!tenantData) {
          throw new Error(
            'No tenant account found with this email.\n\n' +
            'Next steps:\n' +
            '1. Contact your property owner\n' +
            '2. Ask them to add you as a tenant\n' +
            '3. Accept the invitation link they send\n\n' +
            `Your email: ${cleanEmail}`
          );
        }

        console.log('✅ Tenant record found:', tenantData.name);

        // Check if invitation has been accepted
        const invitationAccepted = await hasAcceptedInvitation(cleanEmail);
        
        console.log('🔍 Invitation status:', invitationAccepted);

        if (!invitationAccepted) {
          throw new Error(
            'Please accept your invitation first.\n\n' +
            'Check your email for the invitation link from your property owner.'
          );
        }

        // Store tenant name for later use
        localStorage.setItem('pg_tenant_name', tenantData.name);
        console.log('✅ Tenant verified and invitation accepted');
      }

      // Send OTP
      console.log('📧 Sending OTP...');
      const { error: signInError } = await signIn(cleanEmail);
      
      if (signInError) {
        console.error('❌ Sign in error:', signInError);
        throw new Error(`Failed to send login code: ${signInError.message}`);
      }
      
      console.log('✅ OTP sent successfully');
      setMessage(`✓ Login code sent to ${cleanEmail}`);
      setShowOtpInput(true);
      
    } catch (err: any) {
      console.error('❌ Login error:', err);
      setError(err.message || 'Error sending login code. Please try again.');
      
      // Clear stored data on error
      localStorage.removeItem('pg_user_role');
      localStorage.removeItem('pg_user_email');
      localStorage.removeItem('pg_auth_timestamp');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify OTP and login
   */
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      // Validate OTP format
      if (!otp || otp.trim().length < 6) {
        throw new Error('Please enter a valid verification code');
      }

      const cleanEmail = email.toLowerCase().trim();
      const storedRole = localStorage.getItem('pg_user_role');
      const storedEmail = localStorage.getItem('pg_user_email');

      console.log('🔐 Verifying OTP...', { 
        email: cleanEmail, 
        storedRole, 
        storedEmail 
      });

      // Verify OTP
      await verifyOtp(cleanEmail, otp.trim());
      
      console.log('✅ OTP verified successfully');

      // CRITICAL: Re-verify and set role after OTP verification
      const finalRole = localStorage.getItem('pg_user_role');
      const finalEmail = localStorage.getItem('pg_user_email');

      console.log('🔍 Final check:', { finalRole, finalEmail });

      // If tenant, update tenant record with auth_user_id
      if (finalRole === 'tenant' || storedRole === 'tenant') {
        console.log('🔄 Tenant login - updating tenant record...');
        
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          console.log('🔄 Linking tenant to auth user:', user.id);
          
          await supabase
            .from('tenants')
            .update({ 
              auth_user_id: user.id 
            })
            .eq('email', cleanEmail);
          
          console.log('✅ Tenant record updated with auth_user_id');
        }

        // FORCE tenant role
        localStorage.setItem('pg_user_role', 'tenant');
        localStorage.setItem('pg_user_email', cleanEmail);
        localStorage.setItem('pg_auth_timestamp', String(Date.now()));
        
        setMessage('✓ Login successful! Redirecting to tenant dashboard...');
        
        // Force redirect to tenant dashboard
        setTimeout(() => {
          console.log('🔄 Forcing redirect to tenant dashboard');
          window.location.href = window.location.origin + '/#/my-dashboard';
        }, 500);
        
      } else {
        // Owner login
        localStorage.setItem('pg_user_role', 'owner');
        localStorage.setItem('pg_user_email', cleanEmail);
        
        setMessage('✓ Login successful! Redirecting...');
        
        setTimeout(() => {
          console.log('🔄 Redirecting to owner dashboard');
          navigate('/dashboard');
        }, 500);
      }
      
    } catch (err: any) {
      console.error('❌ OTP verification error:', err);
      
      let errorMessage = err.message || 'Invalid verification code';
      
      // Handle common errors
      if (errorMessage.includes('Token has expired') || errorMessage.includes('expired')) {
        errorMessage = 'Verification code has expired. Please request a new one.';
      } else if (errorMessage.includes('Invalid') || errorMessage.includes('invalid')) {
        errorMessage = 'Invalid verification code. Please check and try again.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle demo login - bypasses authentication completely
   */
  const handleDemoLogin = (demoRole: 'owner' | 'tenant') => {
    setIsLoading(true);
    setError('');
    setMessage('');
    
    try {
      console.log('🎭 Demo login:', demoRole);
      
      // Clear all storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Set demo credentials
      if (demoRole === 'owner') {
        localStorage.setItem('pg_user_email', 'demo.owner@ashirwadpg.com');
        localStorage.setItem('pg_user_role', 'owner');
        localStorage.setItem('pg_auth_timestamp', Date.now().toString());
        localStorage.setItem('pg_demo_mode', 'true');
        
        setMessage('✓ Logged in as Demo Owner. Redirecting...');
        
        setTimeout(() => {
          window.location.href = window.location.origin + '/#/dashboard';
        }, 800);
        
      } else {
        localStorage.setItem('pg_user_email', 'demo.tenant@ashirwadpg.com');
        localStorage.setItem('pg_user_role', 'tenant');
        localStorage.setItem('pg_auth_timestamp', Date.now().toString());
        localStorage.setItem('pg_demo_mode', 'true');
        localStorage.setItem('pg_tenant_name', 'Demo Tenant');
        
        setMessage('✓ Logged in as Demo Tenant. Redirecting...');
        
        setTimeout(() => {
          window.location.href = window.location.origin + '/#/my-dashboard';
        }, 800);
      }
      
    } catch (err: any) {
      console.error('❌ Demo login error:', err);
      setError('Failed to login as demo. Please try again.');
      setIsLoading(false);
    }
  };

  /**
   * Request new OTP
   */
  const handleRequestNewCode = async () => {
    setIsLoading(true);
    setError('');
    setOtp('');
    
    try {
      console.log('🔄 Requesting new OTP...');
      
      const { error: signInError } = await signIn(email.toLowerCase().trim());
      if (signInError) throw signInError;
      
      setMessage('✓ New verification code sent!');
      
    } catch (err: any) {
      console.error('❌ Resend error:', err);
      setError('Failed to send new code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
            <Home className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
            AshirwadPG
          </h1>
          <p className="text-muted-foreground mt-2">Manage your property with ease</p>
        </div>

        {/* Login Card */}
        <div className="bg-card p-8 rounded-2xl shadow-xl border border-border">
          {!showOtpInput ? (
            <>
              {/* Role Toggle */}
              <div className="flex p-1 bg-secondary/50 rounded-xl mb-6 border border-border">
                <button 
                  type="button"
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    !isTenant 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setIsTenant(false);
                    setError('');
                    setMessage('');
                  }}
                >
                  Owner
                </button>
                <button 
                  type="button"
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    isTenant 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => {
                    setIsTenant(true);
                    setError('');
                    setMessage('');
                  }}
                >
                  Tenant
                </button>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSendCode} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email address
                  </label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="you@example.com"
                    disabled={isLoading}
                  />
                  {isTenant && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Use the email from your invitation
                    </p>
                  )}
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || !email}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send Login Code'
                  )}
                </button>
              </form>

              {/* Demo Login Section */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or Try Demo</span>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  type="button"
                  onClick={() => handleDemoLogin('owner')}
                  disabled={isLoading}
                  className="w-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 py-3 rounded-lg font-medium hover:bg-blue-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <PlayCircle className="w-4 h-4" />
                  Try as Demo Owner
                </button>
                <button 
                  type="button"
                  onClick={() => handleDemoLogin('tenant')}
                  disabled={isLoading}
                  className="w-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 py-3 rounded-lg font-medium hover:bg-green-500/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <User className="w-4 h-4" />
                  Try as Demo Tenant
                </button>
              </div>

              {/* Back to Home */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => navigate('/')}
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 mx-auto"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Home
                </button>
              </div>
            </>
          ) : (
            /* OTP Verification Form */
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <button 
                type="button"
                onClick={() => {
                  setShowOtpInput(false);
                  setOtp('');
                  setError('');
                  setMessage('');
                }}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> Back to email
              </button>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <KeyRound className="w-4 h-4" />
                  Enter Verification Code
                </label>
                <input 
                  type="text" 
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\s/g, ''))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all tracking-widest font-mono text-center text-lg"
                  placeholder="000000"
                  autoFocus
                  maxLength={8}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Code sent to <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              <button 
                type="submit" 
                disabled={isLoading || otp.length < 6}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Verify & Login
                  </>
                )}
              </button>

              <button 
                type="button"
                onClick={handleRequestNewCode}
                disabled={isLoading}
                className="w-full bg-transparent text-muted-foreground hover:text-foreground py-2 text-sm flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3" /> Request New Code
              </button>
            </form>
          )}

          {/* Success Message */}
          {message && (
            <div className="mt-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-center text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-center text-destructive animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-center gap-2 font-medium mb-1">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                Error
              </div>
              <span className="text-xs whitespace-pre-line">{message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          {isTenant ? 'New tenant? Check your email for invitation link' : 'Demo accounts come pre-loaded with sample data'}
        </p>
      </div>
    </div>
  );
};

export default Login;
