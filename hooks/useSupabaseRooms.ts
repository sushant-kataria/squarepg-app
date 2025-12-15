import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Room } from '../types';

export const useSupabaseRooms = () => {
  const [data, setData] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    setLoading(true);
    const { data: roomsData, error } = await supabase
      .from('rooms')
      .select('*')
      .order('number', { ascending: true });

    if (roomsData && !error) {
      // Map snake_case to camelCase
      const mappedRooms: Room[] = roomsData.map((r: any) => ({
        id: r.id,
        number: r.number,
        type: r.type,
        status: r.status,
        price: r.price,
        floor: r.floor,
        capacity: r.capacity || 1,
        currentOccupancy: r.current_occupancy || 0
      }));
      setData(mappedRooms);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    const channel = supabase
      .channel('rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { data, loading, setData, refetch: fetchRooms };
};
