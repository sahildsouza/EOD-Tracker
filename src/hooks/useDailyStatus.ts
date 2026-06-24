import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getCurrentDateIST } from '../utils/dateUtils';

export interface DailyStatus {
  id: string;
  user_id: string;
  date: string;
  status: 'shift' | 'leave' | 'week-off';
  shift_id: string | null;
}

export function useDailyStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<DailyStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      const today = getCurrentDateIST();
      const { data, error } = await supabase
        .from('daily_statuses')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();
      
      if (!error && data) {
        setStatus(data as DailyStatus);
      }
      setIsLoading(false);
    };

    fetchStatus();
  }, [user]);

  const updateStatus = async (newStatus: 'shift' | 'leave' | 'week-off', shiftId?: string) => {
    if (!user) return;
    const today = getCurrentDateIST();
    
    const payload = {
      user_id: user.id,
      date: today,
      status: newStatus,
      shift_id: shiftId || null
    };

    if (status) {
      const { error } = await supabase
        .from('daily_statuses')
        .update(payload)
        .eq('id', status.id);
      if (error) throw error;
      setStatus({ ...status, ...payload });
    } else {
      const { data, error } = await supabase
        .from('daily_statuses')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      setStatus(data as DailyStatus);
    }
  };

  return { status, isLoading, updateStatus };
}
