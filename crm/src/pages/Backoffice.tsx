import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { DailyGoals } from '@/hooks/useSettings';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { type WeekSchedule, type DaySchedule, isWithinOperatingHours } from '@/utils/operatingHours';

interface ProfileData {
  user_id: string;
  full_name: string;
  phone_e164: string | null;
}

const DAY_LABELS: Record<keyof WeekSchedule, string> = {
  mon: 'Lunes',
  tue: 'Martes',
  wed: 'Miércoles',
  thu: 'Jueves',
  fri: 'Viernes',
  sat: 'Sábado',
  sun: 'Domingo',
};

const DAY_ORDER: Array<keyof WeekSchedule> = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const DAY_TO_GOAL_KEY: Record<keyof WeekSchedule, keyof DailyGoals | null> = {
  mon: 'lunes',
  tue: 'martes',
  wed: 'miercoles',
  thu: 'jueves',
  fri: 'viernes',
  sat: null,
  sun: null,
};

const Backoffice = () => {
  const { signOut, role } = useAuth();
  const { settings, updateSetting } = useSettings();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [maxAttempts, setMaxAttempts] = useState('');
  const [inactivityTimeout, setInactivityTimeout] = useState('');
  const [editingPhone, setEditingPhone] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState<WeekSchedule>(settings.operating_hours);
  const [goalCalls, setGoalCalls] = useState<DailyGoals>(settings.daily_goal_calls);
  const [goalScheduled, setGoalScheduled] = useState<DailyGoals>(settings.daily_goal_scheduled);

  useEffect(() => {
    setMaxAttempts(String(settings.max_attempts));
    setInactivityTimeout(String(settings.inactivity_timeout_seconds));
    setSchedule(settings.operating_hours);
    setGoalCalls(settings.daily_goal_calls);
    setGoalScheduled(settings.daily_goal_scheduled);
  }, [settings]);

  // Only fetch ejecutivas (exclude admins)
  useEffect(() => {
    const fetchEjecutivas = async () => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (roleData && roleData.length > 0) {
        const adminIds = new Set(roleData.filter(r => r.role === 'admin').map(r => r.user_id));
        const ejecutivaIds = roleData
          .filter(r => r.role === 'ejecutiva' && !adminIds.has(r.user_id))
          .map(r => r.user_id);
        if (ejecutivaIds.length > 0) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone_e164')
            .in('user_id', ejecutivaIds);
          if (profileData) setProfiles(profileData);
        } else {
          setProfiles([]);
        }
      }
    };
    fetchEjecutivas();
  }, []);

  const handleSaveSettings = async () => {
    const r1 = await updateSetting('max_attempts', maxAttempts);
    const r2 = await updateSetting('inactivity_timeout_seconds', inactivityTimeout);
    const r3 = await updateSetting('operating_hours', JSON.stringify(schedule));
    const r4 = await updateSetting('daily_goal_calls', JSON.stringify(goalCalls));
    const r5 = await updateSetting('daily_goal_scheduled', JSON.stringify(goalScheduled));
    if (!r1.error && !r2.error && !r3.error && !r4.error && !r5.error) {
      toast.success('Configuración guardada');
    } else {
      toast.error('Error al guardar');
    }
  };

  const handleSavePhone = async (userId: string) => {
    const phone = editingPhone[userId];
    if (!phone) return;
    const { error } = await supabase
      .from('profiles')
      .update({ phone_e164: phone })
      .eq('user_id', userId);
    if (error) {
      toast.error('Error al guardar teléfono');
    } else {
      toast.success('Teléfono guardado');
      setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, phone_e164: phone } : p));
      setEditingPhone(prev => {
        const n = { ...prev };
        delete n[userId];
        return n;
      });
    }
  };

  const toggleDay = (day: keyof WeekSchedule) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day] ? null : { start: '09:00', end: '18:00' },
    }));
  };

  const updateDayTime = (day: keyof WeekSchedule, field: 'start' | 'end', value: string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: prev[day] ? { ...prev[day]!, [field]: value } : null,
    }));
  };

  if (role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-destructive font-bold">Acceso denegado</p>
      </div>
    );
  }

  const currentlyOperating = isWithinOperatingHours(schedule);

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-4">
          <span className="text-2xl">⚙️</span>
          <h1 className="text-xl font-black text-gradient-brand">BACKOFFICE</h1>
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${currentlyOperating ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
            {currentlyOperating ? '🟢 En horario' : '🌙 Fuera de horario'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin')}>
            📊 Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/executive')}>
            📞 Vista Ejecutiva
          </Button>
          <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="p-6 max-w-3xl mx-auto space-y-8">
        {/* Settings */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <h2 className="text-lg font-bold text-foreground">⚙️ Configuración del Sistema</h2>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Máximo de intentos antes de descartar un lead
              </label>
              <div className="flex gap-3">
                <Input type="number" min="1" max="50" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} className="w-32" />
                <span className="text-muted-foreground self-center text-sm">intentos</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Tiempo de inactividad antes de alerta
              </label>
              <div className="flex gap-3">
                <Input type="number" min="30" max="600" value={inactivityTimeout} onChange={e => setInactivityTimeout(e.target.value)} className="w-32" />
                <span className="text-muted-foreground self-center text-sm">segundos ({Math.floor(Number(inactivityTimeout) / 60)}m {Number(inactivityTimeout) % 60}s)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Operating Hours */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">🕐 Horario Operativo</h2>
          <p className="text-sm text-muted-foreground">
            Fuera de horario, las alertas se pausan y los leads se acumulan silenciosamente. Feriados chilenos también pausan automáticamente.
          </p>

          <div className="space-y-2">
            {DAY_ORDER.map(day => {
              const dayData = schedule[day];
              const active = dayData !== null;
              const goalKey = DAY_TO_GOAL_KEY[day];
              return (
                <div key={day} className={`flex items-center gap-3 p-3 rounded-lg ${active ? 'bg-secondary' : 'bg-muted/30'}`}>
                  <button
                    onClick={() => toggleDay(day)}
                    className={`w-8 h-8 rounded-md flex items-center justify-center text-sm font-bold transition-colors ${
                      active ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {active ? '✓' : '✗'}
                  </button>
                  <span className="w-20 font-medium text-foreground text-sm">{DAY_LABELS[day]}</span>
                  {active ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={dayData.start}
                          onChange={e => updateDayTime(day, 'start', e.target.value)}
                          className="w-28"
                        />
                        <span className="text-muted-foreground text-xs">a</span>
                        <Input
                          type="time"
                          value={dayData.end}
                          onChange={e => updateDayTime(day, 'end', e.target.value)}
                          className="w-28"
                        />
                      </div>
                      {goalKey && (
                        <div className="flex items-center gap-2 ml-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">📞</span>
                            <Input
                              type="number"
                              min="0"
                              max="200"
                              value={goalCalls[goalKey]}
                              onChange={e => setGoalCalls(prev => ({ ...prev, [goalKey]: parseInt(e.target.value) || 0 }))}
                              className="w-16 h-8 text-xs"
                              title="Meta de llamados"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground">📅</span>
                            <Input
                              type="number"
                              min="0"
                              max="50"
                              value={goalScheduled[goalKey]}
                              onChange={e => setGoalScheduled(prev => ({ ...prev, [goalKey]: parseInt(e.target.value) || 0 }))}
                              className="w-16 h-8 text-xs"
                              title="Meta de agendadas"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground text-sm italic">No se atiende</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">📞 = Meta de llamados &nbsp; 📅 = Meta de reuniones agendadas</p>
        </div>

        {/* Save all */}
        <Button onClick={handleSaveSettings} className="w-full" size="lg">
          💾 Guardar toda la configuración
        </Button>

        {/* Profiles / Phone management */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-bold text-foreground">👥 Ejecutivas - Teléfonos</h2>
          <p className="text-sm text-muted-foreground">
            Configura el número personal de cada ejecutiva (formato E.164, ej: +56912345678)
          </p>

          <div className="space-y-3">
            {profiles.map(profile => (
              <div key={profile.user_id} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
                <div className="flex-1">
                  <p className="font-bold text-foreground">{profile.full_name || 'Sin nombre'}</p>
                  <p className="text-xs text-muted-foreground font-mono">{profile.user_id.slice(0, 8)}...</p>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="+56912345678"
                    value={editingPhone[profile.user_id] ?? profile.phone_e164 ?? ''}
                    onChange={e => setEditingPhone(prev => ({ ...prev, [profile.user_id]: e.target.value }))}
                    className="w-48"
                  />
                  {editingPhone[profile.user_id] !== undefined && (
                    <Button size="sm" onClick={() => handleSavePhone(profile.user_id)}>
                      Guardar
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {profiles.length === 0 && (
              <p className="text-muted-foreground text-sm">No hay ejecutivas registradas</p>
            )}
          </div>
        </div>

        {/* Make Integration Info */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-2 text-foreground">📡 Integración con Make</h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Para integrar con Make (Facebook Lead Ads), haz un <code className="bg-secondary px-2 py-0.5 rounded text-accent font-mono">INSERT</code> en la tabla <code className="bg-secondary px-2 py-0.5 rounded text-accent font-mono">leads</code> con:
          </p>
          <pre className="mt-3 p-4 bg-secondary rounded-lg text-xs font-mono text-foreground overflow-auto">
{`{
  "source": "facebook",
  "external_id": "fb_lead_id",
  "name": "Nombre del lead",
  "phone": "+56912345678",
  "email": "email@ejemplo.com",
  "rut": "12345678-9",
  "sueldo_liquido": 800000,
  "en_dicom": false,
  "created_time": "2025-01-01T00:00:00Z",
  "status": "new"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default Backoffice;
