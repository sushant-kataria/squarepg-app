import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import Rooms from './pages/Rooms';
import Payments from './pages/Payments';
import Expenses from './pages/Expenses';
import Complaints from './pages/Complaints';
import Settings from './pages/Settings';
import Login from './pages/Login';
import TenantDashboard from './pages/TenantDashboard';
import AcceptInvite from './pages/AcceptInvite';
import AboutUs from './pages/Aboutus';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';
import TenantLayout from './components/TenantLayout';
import TenantPayments from './pages/TenantPayments';
import TenantComplaints from './pages/TenantComplaints';

/**
 * Check if user is in demo mode
 */
const isDemoMode = () => {
  const demoFlag = localStorage.getItem('pg_demo_mode');
  const demoEmail = localStorage.getItem('pg_user_email');
  return demoFlag === 'true' || 
         demoEmail === 'demo.owner@ashirwadpg.com' || 
         demoEmail === 'demo.tenant@ashirwadpg.com';
};

/**
 * Protected Route Component
 * Ensures user is authenticated before accessing routes
 * Allows demo users and recent tenant sessions to bypass authentication
 */
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, role } = useAuth();
  const isDemo = isDemoMode();
  
  // Check for recent tenant session in localStorage
  const storedRole = localStorage.getItem('pg_user_role');
  const storedEmail = localStorage.getItem('pg_user_email');
  const authTimestamp = localStorage.getItem('pg_auth_timestamp');
  
  let hasRecentTenantAuth = false;
  if (storedRole === 'tenant' && storedEmail && authTimestamp) {
    const timeDiff = Date.now() - Number(authTimestamp);
    hasRecentTenantAuth = timeDiff < 24 * 60 * 60 * 1000; // 24 hours
  }
  
  if (loading && !isDemo && !hasRecentTenantAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Allow access if:
  // 1. Demo mode, OR
  // 2. Has valid session, OR
  // 3. Has recent tenant authentication (within 24 hours)
  if (!session && !isDemo && !hasRecentTenantAuth) {
    console.log('🚫 No session found, redirecting to login', {
      hasSession: !!session,
      isDemo,
      hasRecentTenantAuth,
      storedRole,
      role
    });
    return <Navigate to="/login" replace />;
  }
  
  console.log('✅ Protected route access granted', {
    hasSession: !!session,
    isDemo,
    hasRecentTenantAuth,
    role
  });
  
  return <>{children}</>;
};

/**
 * Role-Based Route Component
 * Redirects users based on their role
 * Supports demo mode
 */
const RoleRoute: React.FC<{ 
  children: React.ReactNode; 
  allowed: 'owner' | 'tenant' 
}> = ({ children, allowed }) => {
  const { role, loading } = useAuth();
  const storedRole = localStorage.getItem('pg_user_role');
  const authTimestamp = localStorage.getItem('pg_auth_timestamp');
  const isDemo = isDemoMode();
  
  // Use stored role if it's recent (within 5 minutes) or in demo mode
  let effectiveRole = role;
  if (storedRole && (isDemo || authTimestamp)) {
    if (isDemo) {
      effectiveRole = storedRole as 'owner' | 'tenant';
    } else {
      const timeDiff = Date.now() - Number(authTimestamp);
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        effectiveRole = storedRole as 'owner' | 'tenant';
      }
    }
  }
  
  console.log('🛡️ RoleRoute check:', { 
    allowed, 
    effectiveRole, 
    storedRole, 
    contextRole: role,
    loading,
    isDemo,
    hasRecentAuth: !!authTimestamp
  });

  // Don't redirect while still loading (unless demo)
  if (loading && !isDemo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check role mismatch
  if (effectiveRole !== allowed) {
    console.log('❌ Role mismatch - Redirecting...', {
      required: allowed,
      actual: effectiveRole
    });

    if (effectiveRole === 'tenant') {
      console.log('🔄 Redirecting tenant to dashboard');
      return <Navigate to="/my-dashboard" replace />;
    }
    
    if (effectiveRole === 'owner') {
      console.log('🔄 Redirecting owner to main dashboard');
      return <Navigate to="/dashboard" replace />;
    }

    // If no role detected and not demo, send to login
    if (!isDemo) {
      console.log('🔄 No role detected, redirecting to login');
      return <Navigate to="/login" replace />;
    }
  }
  
  console.log('✅ Role matches, rendering content');
  return <>{children}</>;
};

/**
 * Role-Based Redirect Component
 * Redirects to appropriate dashboard based on user role
 */
const RoleBasedRedirect: React.FC = () => {
  const { role, session } = useAuth();
  const storedRole = localStorage.getItem('pg_user_role');
  const isDemo = isDemoMode();
  const effectiveRole = storedRole || role;

  console.log('🔀 Role-based redirect:', { effectiveRole, session: !!session, isDemo });

  // If no session and not demo, go to home (About Us page)
  if (!session && !isDemo) {
    return <Navigate to="/" replace />;
  }

  if (effectiveRole === 'tenant') {
    return <Navigate to="/my-dashboard" replace />;
  }

  if (effectiveRole === 'owner') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/" replace />;
};

/**
 * Main Application Routes
 */
const AppRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<AboutUs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth" element={<Login />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />
        
        {/* Owner Routes - Protected with Sidebar */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Dashboard /></Layout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tenants" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Tenants /></Layout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rooms" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Rooms /></Layout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/payments" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Payments /></Layout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/expenses" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Expenses /></Layout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/complaints" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Complaints /></Layout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Settings /></Layout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />

        {/* Tenant Routes - Protected with Tenant Sidebar */}
        <Route 
          path="/my-dashboard" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="tenant">
                <TenantLayout><TenantDashboard /></TenantLayout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-payments" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="tenant">
                <TenantLayout><TenantPayments /></TenantLayout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/my-complaints" 
          element={
            <ProtectedRoute>
              <RoleRoute allowed="tenant">
                <TenantLayout><TenantComplaints /></TenantLayout>
              </RoleRoute>
            </ProtectedRoute>
          } 
        />

        {/* Catch-all redirect based on role */}
        <Route 
          path="*" 
          element={<RoleBasedRedirect />} 
        />
      </Routes>
    </ErrorBoundary>
  );
};

/**
 * App Content Component
 * Handles Supabase auth session processing
 */
const AppContent: React.FC = () => {
  const { loading, session, role } = useAuth();
  const isDemo = isDemoMode();
  const [isProcessingHash, setIsProcessingHash] = useState(() => {
    const hash = window.location.hash;
    return hash && (
      hash.includes('access_token') || 
      hash.includes('type=signup') || 
      hash.includes('type=magiclink') ||
      hash.includes('type=recovery') ||
      hash.includes('type=invite') ||
      hash.includes('type=email')
    );
  });

  useEffect(() => {
    console.log('🔍 App state:', { 
      loading, 
      hasSession: !!session, 
      role,
      isDemo,
      isProcessingHash,
      path: window.location.hash 
    });

    // Skip processing if in demo mode
    if (isDemo) {
      setIsProcessingHash(false);
      return;
    }

    if (!loading) {
      if (session && isProcessingHash) {
        console.log('✅ Session authenticated, clearing hash');
        
        // Clear hash after successful authentication
        const currentPath = window.location.hash.split('?')[0].split('#')[0];
        if (currentPath.includes('access_token') || currentPath.includes('type=')) {
          // Get the base path without auth parameters
          const cleanPath = currentPath.split('?')[0] || '';
          window.location.hash = cleanPath;
        }
        
        setTimeout(() => setIsProcessingHash(false), 100);
      } else {
        setIsProcessingHash(false);
      }
    }
  }, [loading, session, isProcessingHash, role, isDemo]);

  // Show loading spinner (skip for demo mode)
  if ((loading || isProcessingHash) && !isDemo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-background text-foreground animate-in fade-in">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <div className="text-center">
          <p className="text-lg font-medium">
            {isProcessingHash ? 'Verifying Authentication...' : 'Loading Dashboard...'}
          </p>
          {isProcessingHash && (
            <p className="text-xs text-muted-foreground mt-1">
              Please wait while we log you in securely
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
};

/**
 * Main App Component
 */
const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
