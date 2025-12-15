import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Hexagon, 
  Loader2, 
  Mail, 
  CheckCircle, 
  AlertTriangle, 
  ArrowRight,
  Shield,
  Clock,
  User
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { 
  getInvitationByToken, 
  acceptInvitation, 
  validateInvitation 
} from '../lib/invitations';
import { Invitation } from '../types';

const AcceptInvite: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Load and validate invitation on mount
  useEffect(() => {
    if (!token) {
      setError('No invitation token provided in the URL');
      setLoading(false);
      return;
    }
    
    loadInvitation();
  }, [token]);

  /**
   * Load invitation details from database
   */
  const loadInvitation = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('📧 Loading invitation for token:', token);

      const data = await getInvitationByToken(token!);
      
      // Validate the invitation
      const validation = validateInvitation(data);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid invitation');
        setLoading(false);
        return;
      }
      
      console.log('✅ Invitation loaded:', data);
      
      setInvitation(data);
      setEmail(data.tenant_email);
      setLoading(false);
    } catch (err: any) {
      console.error('❌ Error loading invitation:', err);
      setError(err.message || 'Invalid or expired invitation');
      setLoading(false);
    }
  };

  /**
   * Send OTP to user's email
   */
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate email matches invitation
      if (email.toLowerCase().trim() !== invitation?.tenant_email.toLowerCase().trim()) {
        throw new Error('Email does not match the invitation. Please use the invited email address.');
      }

      console.log('📧 Sending OTP to:', email);

      // Send OTP
      const { data, error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined,
        }
      });

      if (otpError) {
        console.error('❌ OTP send error:', otpError);
        throw new Error(`Failed to send verification code: ${otpError.message}`);
      }

      console.log('✅ OTP sent successfully:', data);

      setShowOtpInput(true);
      setOtpSent(true);
      
      alert('✅ Verification code sent to your email!\n\nPlease check your inbox (and spam folder).');
      
    } catch (err: any) {
      console.error('❌ Error sending OTP:', err);
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

/**
 * Verify OTP and activate tenant account
 */
const handleVerifyOtp = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);
  setError('');

  try {
    // Validate OTP format (6-8 digits)
    if (!otp || otp.trim().length < 6 || otp.trim().length > 8) {
      throw new Error('Please enter a valid 6-8 digit verification code');
    }

    console.log('🔐 Verifying OTP for:', email);

    // STEP 1: Verify OTP with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp.trim(),
      type: 'email',
    });

    if (authError) {
      console.error('❌ OTP verification error:', authError);
      throw new Error(`Verification failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error('No user data returned after verification');
    }

    console.log('✅ OTP verified successfully:', authData.user.email);

    // STEP 2: Check if tenant exists in database
    console.log('🔍 Checking if tenant exists...');
    
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id, name, email, roomNumber, auth_user_id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking tenant:', checkError);
      throw new Error('Database error. Please try again or contact support.');
    }

    if (!existingTenant) {
      console.error('❌ No tenant record found for email:', email);
      throw new Error(
        'No tenant record found for this email.\n\n' +
        'Your invitation may be invalid or you need to be added as a tenant first.\n\n' +
        'Please contact your property manager.'
      );
    }

    console.log('✅ Tenant record found:', existingTenant);

    // STEP 3: Accept the invitation in database
    console.log('📝 Accepting invitation...');
    
    try {
      await acceptInvitation(token!, email);
      console.log('✅ Invitation accepted successfully');
    } catch (inviteError: any) {
      console.error('⚠️ Warning: Could not accept invitation:', inviteError);
      // Don't fail here - tenant might already be accepted or invitation is old
    }

    // STEP 4: Update tenant record with auth_user_id
    console.log('🔄 Updating tenant record with auth user ID...');
    
    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({ 
        auth_user_id: authData.user.id,
        status: 'Active'
      })
      .eq('id', existingTenant.id)  // Use ID instead of email for reliability
      .select('id, name, email, roomNumber')
      .single();

    if (updateError) {
      console.error('❌ Error updating tenant record:', updateError);
      console.error('Update details:', {
        tenantId: existingTenant.id,
        authUserId: authData.user.id,
        error: updateError
      });
      throw new Error(
        'Failed to link your account to tenant record.\n\n' +
        `Error: ${updateError.message}\n\n` +
        'Please contact support with this information.'
      );
    }

    if (!updatedTenant) {
      throw new Error('No data returned after updating tenant. Please contact support.');
    }

    console.log('✅ Tenant record updated successfully:', updatedTenant);

    // STEP 5: Set localStorage with tenant data BEFORE navigation
    console.log('💾 Setting tenant session data...');
    
    // Clear everything first
    localStorage.clear();
    sessionStorage.clear();
    
    // Set tenant session data
    localStorage.setItem('pg_user_role', 'tenant');
    localStorage.setItem('pg_user_email', email.toLowerCase().trim());
    localStorage.setItem('pg_tenant_name', updatedTenant.name || invitation?.tenant_name || '');
    localStorage.setItem('pg_user_id', authData.user.id);
    localStorage.setItem('pg_tenant_id', String(updatedTenant.id));
    localStorage.setItem('pg_auth_timestamp', String(Date.now()));
    
    console.log('✅ Tenant session data set:', {
      role: 'tenant',
      email: email.toLowerCase().trim(),
      name: updatedTenant.name,
      userId: authData.user.id,
      tenantId: updatedTenant.id,
      timestamp: Date.now()
    });

// STEP 6: Show success message
const welcomeName = updatedTenant.name || invitation?.tenant_name || 'there';

console.log('✅ Tenant account setup complete:', {
  name: welcomeName,
  email: email,
  tenantId: updatedTenant.id,
  role: 'tenant'
});

// STEP 7: Wait a moment for state to settle
await new Promise(resolve => setTimeout(resolve, 100));

// STEP 8: Show success and redirect
alert(
  `🎉 Account activated successfully!\n\n` +
  `Welcome to AshirwadPG, ${welcomeName}!\n\n` +
  `Redirecting to your dashboard...`
);

// Direct navigation without reload (session is already active)
navigate('/my-dashboard', { replace: true });

  } catch (err: any) {
    console.error('❌ Error verifying OTP:', err);
    setError(err.message || 'Failed to verify code. Please try again.');
  } finally {
    setIsSubmitting(false);
  }
};


  /**
   * Resend OTP
   */
  const handleResendOtp = async () => {
    setIsSubmitting(true);
    setError('');
    setOtp('');
    
    try {
      console.log('🔄 Resending OTP to:', email);

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: undefined,
        }
      });

      if (otpError) {
        console.error('❌ Resend error:', otpError);
        throw otpError;
      }

      console.log('✅ OTP resent successfully');
      alert('✅ New verification code sent! Please check your email.');
      
    } catch (err: any) {
      console.error('❌ Error resending OTP:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading invitation...</p>
        </div>
      </div>
    );
  }

  // Error state (no valid invitation)
  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md bg-card p-8 rounded-2xl shadow-xl border border-border text-center">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold mb-2 text-foreground">Invalid Invitation</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:bg-primary/90 font-medium transition-colors"
            >
              Go to Login
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-secondary text-secondary-foreground px-6 py-2.5 rounded-lg hover:bg-secondary/90 font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Main invitation acceptance UI
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
            <Hexagon className="w-10 h-10 fill-current" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome to AshirwadPG!</h1>
          <p className="text-muted-foreground mt-2">Setup your tenant account</p>
        </div>

        {/* Invitation Details Card */}
        {invitation && (
          <div className="bg-card p-8 rounded-2xl shadow-xl border border-border space-y-6">
            {/* Tenant Info */}
            <div className="bg-secondary/30 p-4 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                <span>You're invited as:</span>
              </div>
              <div>
                <p className="font-bold text-lg text-foreground">{invitation.tenant_name}</p>
                <p className="text-sm text-muted-foreground">{invitation.tenant_email}</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t border-border">
                <Clock className="w-3 h-3" />
                <span>
                  Expires: {new Date(invitation.expires_at || '').toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            {/* Email Confirmation Form */}
            {!showOtpInput ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Confirm Your Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="your@email.com"
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll send a 6-8 digit verification code to this email
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Send Verification Code
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* OTP Verification Form */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-center text-2xl tracking-[0.5em] font-mono font-bold"
                    placeholder="00000000"
                    maxLength={8}
                    autoFocus
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Code sent to <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || otp.length < 6}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Activate Account
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isSubmitting}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors underline disabled:opacity-50"
                >
                  Didn't receive the code? Resend
                </button>
              </form>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-center text-destructive flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Need help? Contact your property manager
        </p>
      </div>
    </div>
  );
};

export default AcceptInvite;
