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
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading } = useAuth();
  const isDemo = localStorage.getItem('pg_user_email') === 'demo@squarepg.com';
  
  if (loading && !isDemo) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!session && !isDemo) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const RoleRoute: React.FC<{ children: React.ReactNode; allowed: 'owner' | 'tenant' }> = ({ children, allowed }) => {
   const { role } = useAuth();
   const storedRole = localStorage.getItem('pg_user_role') || role;
   
   if (storedRole !== allowed) {
      if (storedRole === 'tenant') return <Navigate to="/my-dashboard" replace />;
      if (storedRole === 'owner') return <Navigate to="/" replace />;
   }
   return <>{children}</>;
}

const AppRoutes: React.FC = () => {
  return (
    <ErrorBoundary>
      <Routes>
         <Route path="/login" element={<Login />} />
         
         {/* Owner Routes */}
         <Route path="/" element={
            <ProtectedRoute>
              <RoleRoute allowed="owner">
                <Layout><Dashboard /></Layout>
              </RoleRoute>
            </ProtectedRoute>
         } />
         <Route path="/tenants" element={
            <ProtectedRoute>
               <RoleRoute allowed="owner">
                 <Layout><Tenants /></Layout>
               </RoleRoute>
            </ProtectedRoute>
         } />
         <Route path="/rooms" element={
            <ProtectedRoute>
               <RoleRoute allowed="owner">
                  <Layout><Rooms /></Layout>
               </RoleRoute>
            </ProtectedRoute>
         } />
         <Route path="/payments" element={
            <ProtectedRoute>
               <RoleRoute allowed="owner">
                  <Layout><Payments /></Layout>
               </RoleRoute>
            </ProtectedRoute>
         } />
         <Route path="/expenses" element={
            <ProtectedRoute>
               <RoleRoute allowed="owner">
                  <Layout><Expenses /></Layout>
               </RoleRoute>
            </ProtectedRoute>
         } />
         <Route path="/complaints" element={
            <ProtectedRoute>
               <RoleRoute allowed="owner">
                  <Layout><Complaints /></Layout>
               </RoleRoute>
            </ProtectedRoute>
         } />
         <Route path="/settings" element={
            <ProtectedRoute>
               <RoleRoute allowed="owner">
                  <Layout><Settings /></Layout>
               </RoleRoute>
            </ProtectedRoute>
         } />

         {/* Tenant Routes */}
         <Route path="/my-dashboard" element={
            <ProtectedRoute>
               <RoleRoute allowed="tenant">
                  <Layout><TenantDashboard /></Layout>
               </RoleRoute>
            </ProtectedRoute>
         } />

         <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

const AppContent: React.FC = () => {
  const { loading, session } = useAuth();
  const [isProcessingHash, setIsProcessingHash] = useState(
    () => window.location.hash && (
      window.location.hash.includes('access_token') || 
      window.location.hash.includes('type=signup') || 
      window.location.hash.includes('type=magiclink') ||
      window.location.hash.includes('type=recovery')
    )
  );

  useEffect(() => {
    if (!loading) {
      if (session && isProcessingHash) {
         window.location.hash = ''; 
         setTimeout(() => setIsProcessingHash(false), 50);
      } else {
         setIsProcessingHash(false);
      }
    }
  }, [loading, session, isProcessingHash]);

  if (loading || isProcessingHash) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4 bg-background text-foreground animate-in fade-in">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <div className="text-center">
            <p className="text-lg font-medium">
               {isProcessingHash ? 'Verifying Login...' : 'Loading Dashboard...'}
            </p>
            {isProcessingHash && <p className="text-xs text-muted-foreground mt-1">Please wait while we log you in.</p>}
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