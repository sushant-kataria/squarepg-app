import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export function useSupabase<T>(tableName: string, select = '*') {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  const fetchData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
    }

    try {
      const { data: result, error } = await supabase
        .from(tableName)
        .select(select)
        .order('id', { ascending: true });
      
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
  }, [tableName, select]);

  useEffect(() => {
    let mounted = true;
    
    // Initial fetch
    fetchData();

    // Subscribe to real-time changes
    const channel = supabase
      .channel(`${tableName}_changes`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        () => {
          fetchData(); 
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