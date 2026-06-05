import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EmailButtonsProps {
  leadId: string;
  leadEmail: string | null | undefined;
  compact?: boolean;
}

export default function EmailButtons({ leadId, leadEmail, compact = false }: EmailButtonsProps) {
  const [sendingNoContesto, setSendingNoContesto] = useState(false);
  const [sendingAgendada, setSendingAgendada] = useState(false);

  const normalizedEmail = leadEmail?.trim() ?? '';
  const hasEmail = normalizedEmail.length > 0;

  const sendEmail = async (templateType: 'no_contesto_manual' | 'cliente_interesado_manual') => {
    if (!hasEmail) {
      toast.info('Este lead no tiene email');
      return;
    }

    const setter = templateType === 'no_contesto_manual' ? setSendingNoContesto : setSendingAgendada;
    setter(true);
    try {
      const { data, error } = await supabase.functions.invoke('lead-status-email', {
        body: { lead_id: leadId, new_status: templateType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.queued) {
        toast.success('📬 Mail encolado — se enviará mañana a las 9:00 AM');
      } else if (data?.skipped) {
        toast.info(data.reason === 'Lead has no email' ? 'El lead no tiene email' : 'Email no enviado');
      } else {
        toast.success('✅ Mail enviado exitosamente');
      }
    } catch (err: any) {
      console.error('Error sending email:', err);
      toast.error(`Error al enviar email: ${err.message || 'Error desconocido'}`);
    } finally {
      setter(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">
        {hasEmail ? `Se enviará a ${normalizedEmail}` : 'Este lead no tiene email cargado'}
      </p>
      <div className={`grid gap-2 ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <button
          onClick={() => sendEmail('no_contesto_manual')}
          disabled={!hasEmail || sendingNoContesto}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-warning/40 bg-warning/10 px-3 py-2.5 text-xs font-bold text-warning transition-all hover:border-warning/60 hover:bg-warning/20 disabled:opacity-50"
        >
          {sendingNoContesto ? '⏳ Enviando...' : '📧 No contestó'}
        </button>
        <button
          onClick={() => sendEmail('cliente_interesado_manual')}
          disabled={!hasEmail || sendingAgendada}
          className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-primary/40 bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary transition-all hover:border-primary/60 hover:bg-primary/20 disabled:opacity-50"
        >
          {sendingAgendada ? '⏳ Enviando...' : '📧 Cliente Interesado'}
        </button>
      </div>
    </div>
  );
}
