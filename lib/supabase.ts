import { createClient } from '@supabase/supabase-js';

// Helper to safely access environment variables in both Node (process) and Vite/Browser (import.meta) environments
const getEnv = (key: string) => {
  try {
    // Check for Vite/ESM style env vars
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      // @ts-ignore
      return import.meta.env[key];
    }
    // Check for Node/Process style env vars
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {
    // Ignore errors accessing these objects
  }
  return '';
};

// Use provided keys or fallbacks
const SUPABASE_URL = getEnv('VITE_SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL') || 'https://wlqvbkkokxwthbvwhkcu.supabase.co';
const SUPABASE_ANON_KEY = getEnv('VITE_SUPABASE_ANON_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndscXZia2tva3h3dGhidndoa2N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU2MDY4MDgsImV4cCI6MjA4MTE4MjgwOH0.Dw3qNt3Hec37j3zxi2VcRR2gf39UXnM2hSpQK0gZ-Qg';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    flowType: 'pkce'
  }
});

// Helper to check if Supabase is actually configured
export const isSupabaseConfigured = () => {
  return SUPABASE_URL.includes('supabase.co') && SUPABASE_URL !== 'https://your-project.supabase.co';
};

/**
 * Check if user is in demo mode
 */
export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('pg_demo_mode') === 'true';
};

/**
 * Get the current owner_id based on authentication state
 * Returns demo owner ID if in demo mode, otherwise returns null (RLS handles it)
 */
export const getCurrentOwnerId = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const demoMode = localStorage.getItem('pg_demo_mode') === 'true';
  const demoEmail = localStorage.getItem('pg_user_email');
  
  if (demoMode && demoEmail === 'demo.owner@ashirwadpg.com') {
    return '00000000-0000-0000-0000-000000000001';
  }
  
  // For real users, RLS will handle filtering by auth.uid()
  return null;
};

/**
 * Check if current user is demo owner
 */
export const isDemoOwner = (): boolean => {
  if (typeof window === 'undefined') return false;
  const demoMode = localStorage.getItem('pg_demo_mode') === 'true';
  const demoEmail = localStorage.getItem('pg_user_email');
  return demoMode && demoEmail === 'demo.owner@ashirwadpg.com';
};

/**
 * Check if current user is demo tenant
 */
export const isDemoTenant = (): boolean => {
  if (typeof window === 'undefined') return false;
  const demoMode = localStorage.getItem('pg_demo_mode') === 'true';
  const demoEmail = localStorage.getItem('pg_user_email');
  return demoMode && demoEmail === 'demo.tenant@ashirwadpg.com';
};
