import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SCHEDULE, type WeekSchedule } from '@/utils/operatingHours';

export interface DailyGoals {
  lunes: number;
  martes: number;
  miercoles: number;
  jueves: number;
  viernes: number;
}

export interface AppSettings {
  max_attempts: number;
  inactivity_timeout_seconds: number;
  operating_hours: WeekSchedule;
  daily_goal_calls: DailyGoals;
  daily_goal_scheduled: DailyGoals;
}

const DEFAULT_GOALS: DailyGoals = { lunes: 30, martes: 30, miercoles: 30, jueves: 30, viernes: 20 };
const DEFAULT_SCHEDULED_GOALS: DailyGoals = { lunes: 8, martes: 8, miercoles: 8, jueves: 8, viernes: 5 };

const DEFAULTS: AppSettings = {
  max_attempts: 10,
  inactivity_timeout_seconds: 180,
  operating_hours: DEFAULT_SCHEDULE,
  daily_goal_calls: DEFAULT_GOALS,
  daily_goal_scheduled: DEFAULT_SCHEDULED_GOALS,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value');
    if (data) {
      const s = { ...DEFAULTS };
      data.forEach((row: { key: string; value: string }) => {
        if (row.key === 'max_attempts') s.max_attempts = parseInt(row.value, 10);
        if (row.key === 'inactivity_timeout_seconds') s.inactivity_timeout_seconds = parseInt(row.value, 10);
        if (row.key === 'operating_hours') {
          try { s.operating_hours = JSON.parse(row.value); } catch {}
        }
        if (row.key === 'daily_goal_calls') {
          try { s.daily_goal_calls = JSON.parse(row.value); } catch {}
        }
        if (row.key === 'daily_goal_scheduled') {
          try { s.daily_goal_scheduled = JSON.parse(row.value); } catch {}
        }
      });
      setSettings(s);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('app_settings')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key);
    if (!error) {
      await fetchSettings();
    }
    return { error };
  };

  return { settings, loading, updateSetting, refetch: fetchSettings };
}
