import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useOwnerFilter } from './useOwnerFilter';

export function useSupabase<T>(tableName: string, select = '*') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();
  const { ownerId } = useOwnerFilter();

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from(tableName)
        .select(select)
        .order('id', { ascending: true });

      // Add owner_id filter for tables that have it
      if (['rooms', 'tenants', 'payments', 'expenses'].includes(tableName)) {
        query = query.eq('owner_id', ownerId);
      }

      const { data: result, error } = await query;
      
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
      }

      if (result) {
        setData(result as T[]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tableName, select, ownerId]);

  useEffect(() => {
    let mounted = true;
    
    // Initial fetch
    if (mounted) {
      fetchData();
    }

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          if (mounted) {
            fetchData(); 
          }
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [tableName, select, session, fetchData]);

  return { data, loading, setData, refresh: fetchData };
}
