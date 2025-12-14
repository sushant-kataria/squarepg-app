import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Hexagon, Loader2, Mail, Info, KeyRound, ArrowLeft, AlertTriangle, PlayCircle, User, RefreshCw } from 'lucide-react';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [isTenant, setIsTenant] = useState(false);
  
  const { signIn, verifyOtp, signInAsTenant, loginAsDemo, loading, session, role } = useAuth();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Automatically redirect when logged in
  useEffect(() => {
    if (!loading && session) {
      if (role === 'tenant') {
        navigate('/my-dashboard');
      } else {
        navigate('/');
      }
    }
  }, [session, loading, role, navigate]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const targetRole = isTenant ? 'tenant' : 'owner';
      localStorage.setItem('pg_user_role', targetRole);

      if (isTenant) {
        await signInAsTenant(email);
      } else {
        const { error } = await signIn(email);
        if (error) throw error;
        setMessage('Login code sent to your email.');
        setShowOtpInput(true);
      }
    } catch (err: any) {
      setError(err.message || 'Error logging in');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await verifyOtp(email, otp);
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'Invalid code';
      if (errMsg.includes('Token has expired')) {
          errMsg = 'Token expired. Please send a new code.';
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoRole: 'owner' | 'tenant') => {
      setIsLoading(true);
      try {
        await loginAsDemo(demoRole);
        if (demoRole === 'tenant') navigate('/my-dashboard');
        else navigate('/');
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center">
           <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground mb-4 shadow-lg shadow-primary/20">
              <Hexagon className="w-8 h-8 fill-current" />
           </div>
           <h2 className="text-3xl font-bold tracking-tight text-foreground">SquarePG</h2>
           <p className="text-muted-foreground mt-2">Manage your property with ease</p>
        </div>

        <div className="bg-card p-8 rounded-2xl shadow-xl border border-border">
           {!showOtpInput ? (
             <>
               <div className="flex p-1 bg-secondary rounded-lg mb-6">
                  <button 
                     className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${!isTenant ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                     onClick={() => setIsTenant(false)}
                  >
                     Owner
                  </button>
                  <button 
                     className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${isTenant ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                     onClick={() => setIsTenant(true)}
                  >
                     Tenant
                  </button>
               </div>

               <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-foreground">Email address</label>
                     <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input 
                          type="email" 
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                          placeholder="you@example.com"
                        />
                     </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (isTenant ? 'Login as Tenant' : 'Send Login Code')}
                  </button>
               </form>

               <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border"></div></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">Or</span></div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                   <button 
                      onClick={() => handleDemoLogin('owner')}
                      disabled={isLoading}
                      className="bg-secondary text-secondary-foreground border border-border py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 text-xs"
                   >
                      <PlayCircle className="w-3.5 h-3.5" />
                      Demo Owner
                   </button>
                   <button 
                      onClick={() => handleDemoLogin('tenant')}
                      disabled={isLoading}
                      className="bg-secondary text-secondary-foreground border border-border py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-all flex items-center justify-center gap-2 text-xs"
                   >
                      <User className="w-3.5 h-3.5" />
                      Demo Tenant
                   </button>
               </div>
             </>
           ) : (
             <form onSubmit={handleVerifyOtp} className="space-y-4">
                <button 
                  type="button"
                  onClick={() => setShowOtpInput(false)}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to email
                </button>
                
                <div className="space-y-2">
                   <label className="text-sm font-medium text-foreground">Enter Login Code</label>
                   <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all tracking-widest font-mono text-center text-lg"
                        placeholder="123456"
                        autoFocus
                        maxLength={8}
                      />
                   </div>
                   <p className="text-[10px] text-muted-foreground text-center">
                     We sent a code to <b>{email}</b>.
                   </p>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Login'}
                </button>

                {/* Start Over Button specifically for expired token scenarios */}
                <button 
                   type="button"
                   onClick={() => {
                       setShowOtpInput(false);
                       setOtp('');
                       setError('');
                   }}
                   className="w-full bg-transparent text-muted-foreground hover:text-foreground py-2 text-xs flex items-center justify-center gap-1"
                >
                   <RefreshCw className="w-3 h-3" /> Request New Code
                </button>
             </form>
           )}

           {message && (
             <div className="mt-4 p-3 rounded-lg bg-green-500/10 text-sm text-center text-green-600 animate-in fade-in slide-in-from-top-2 flex items-center justify-center gap-2">
               <Info className="w-4 h-4" /> {message}
             </div>
           )}
           
           {error && (
             <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-sm text-center text-destructive animate-in fade-in slide-in-from-top-2 flex flex-col items-center gap-1">
               <div className="flex items-center gap-2 font-medium">
                   <AlertTriangle className="w-4 h-4" /> Error
               </div>
               <span>{error}</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default Login;