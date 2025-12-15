import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useOwnerFilter } from './useOwnerFilter';

interface Complaint {
  id: number;
  tenantId: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  tenantName?: string; // Added
}

export function useComplaints() {
  const [data, setData] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const { ownerId, isDemoTenant } = useOwnerFilter();

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      // First, get tenant IDs for this owner
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('owner_id', ownerId);

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        setLoading(false);
        return;
      }

      const tenantMap = new Map(tenants?.map(t => [t.id, t.name]) || []);
      const tenantIds = tenants?.map(t => t.id) || [];

      if (tenantIds.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // Then fetch complaints for those tenants
      const { data: result, error } = await supabase
        .from('complaints')
        .select('*')
        .in('tenantId', tenantIds)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching complaints:', error);
      }

      if (result) {
        // Add tenant names to complaints
        const complaintsWithNames = result.map(complaint => ({
          ...complaint,
          tenantName: tenantMap.get(complaint.tenantId) || 'Unknown Tenant'
        }));
        setData(complaintsWithNames as Complaint[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    let mounted = true;
    
    // Initial fetch
    if (mounted) {
      fetchData();
    }

    // Subscribe to real-time changes for complaints
    const complaintsChannel = supabase
      .channel('complaints_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        () => {
          if (mounted) {
            fetchData(); 
          }
        }
      )
      .subscribe();

    // Subscribe to real-time changes for tenants (in case tenant name changes)
    const tenantsChannel = supabase
      .channel('tenants_changes_for_complaints')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tenants' },
        () => {
          if (mounted) {
            fetchData(); 
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(complaintsChannel);
      supabase.removeChannel(tenantsChannel);
    };
  }, [session, fetchData]);

  return { data, loading, setData, refresh: fetchData };
}
