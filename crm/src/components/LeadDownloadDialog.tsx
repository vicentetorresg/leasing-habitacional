import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Lead } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface LeadDownloadDialogProps {
  leads: Lead[];
}

const STATUS_LABELS: Record<string, string> = {
  nuevo: 'Nuevo',
  calling: 'Llamando',
  contactado: 'Contactado',
  recontactar: 'Recontactar',
  no_contesta: 'No Contesta',
  no_califica: 'No Califica',
  esperando_documentos: 'Esperando Documentos',
  solicitando_documentos: 'Documentación Incompleta',
  enviado_a_evaluar: 'Enviado a Evaluar',
  aprobado: 'Aprobado - Buscando Vivienda',
  buscando_vivienda: 'Aprobado - Quiere Mayor Monto',
  aprobado_ok: 'Aprobado OK Todo',
  rechaza_oferta: 'Aprobado - Rechaza Oferta',
  set_hipotecario_firmado: 'Set Hipotecario Firmado',
  escritura_firmada: 'Escritura Firmada',
  entregado: 'Entregado',
  cbr_listo: 'CBR Listo',
  rechazado: 'Rechazado',
  archivado: 'Archivado',
  disqualified: 'No Califica',
  bad_number: 'Nro Malo / No Invierte',
  no_answer: 'No Contesto',
  reciclado: 'Reciclado',
};

const LeadDownloadDialog = ({ leads }: LeadDownloadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async (useFilter: boolean) => {
    setDownloading(true);
    try {
      // Fetch ALL leads (not just the ones visible in ejecutiva view)
      // Fetch ALL leads with pagination (Supabase default limit is 1000)
      let allLeads: any[] = [];
      let page = 0;
      const pageSize = 1000;
      while (true) {
        let query = supabase
          .from('leads')
          .select('*')
          .eq('is_demo', false)
          .order('created_at', { ascending: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (useFilter && fromDate) {
          query = query.gte('created_at', new Date(fromDate).toISOString());
        }
        if (useFilter && toDate) {
          const to = new Date(toDate);
          to.setHours(23, 59, 59, 999);
          query = query.lte('created_at', to.toISOString());
        }

        const { data } = await query;
        if (!data || data.length === 0) break;
        allLeads = allLeads.concat(data);
        if (data.length < pageSize) break;
        page++;
      }
      if (!allLeads || allLeads.length === 0) {
        toast.error('No hay leads para descargar con ese filtro');
        setDownloading(false);
        return;
      }

      // Fetch all notes (batch .in() to avoid URL length limits)
      const leadIds = allLeads.map(l => l.id);
      let allNotes: any[] = [];
      const batchSize = 200;
      for (let i = 0; i < leadIds.length; i += batchSize) {
        const batch = leadIds.slice(i, i + batchSize);
        const { data } = await supabase
          .from('lead_notes')
          .select('lead_id, note, created_at')
          .in('lead_id', batch)
          .order('created_at', { ascending: true });
        if (data) allNotes = allNotes.concat(data);
      }

      // Group notes by lead_id
      const notesByLead: Record<string, string[]> = {};
      let maxNotes = 0;
      for (const n of allNotes) {
        if (!notesByLead[n.lead_id]) notesByLead[n.lead_id] = [];
        notesByLead[n.lead_id].push(n.note);
      }
      if (Object.keys(notesByLead).length > 0) {
        maxNotes = Math.max(...Object.values(notesByLead).map(arr => arr.length));
      }

      const rows = allLeads.map(l => {
        const row: Record<string, any> = {
          Nombre: l.name,
          Telefono: l.phone,
          Email: l.email || '',
          RUT: l.rut || '',
          Estado: STATUS_LABELS[l.status] || l.status,
          Fuente: l.source,
          'Renta Liquida': l.sueldo_liquido_raw || (l.sueldo_liquido ? `$${l.sueldo_liquido.toLocaleString('es-CL')}` : ''),
          DICOM: l.en_dicom ? 'Si' : 'No',
          'Propiedad Vista': l.tiene_propiedad_vista === 'si' ? 'Si' : l.tiene_propiedad_vista === 'no' ? 'No' : '',
          'Comuna Propiedad': l.comuna_propiedad || '',
          'Complementa Renta': l.complementa_renta || '',
          'Renta Complemento': l.renta_complemento || '',
          'Valor Propiedad OK': l.precio_propiedad_ok || '',
          'Cuándo Comprar': l.cuando_comprar === 'lo_antes_posible' ? 'Lo antes posible' : l.cuando_comprar === 'dentro_3_meses' ? 'Dentro de 3 meses' : l.cuando_comprar === 'mas_3_meses' ? 'En más de 3 meses' : '',
          Proyecto: l.proyecto || '',
          'Direccion Vivienda': l.direccion_vivienda || '',
          'UF Aprobado Austral': l.uf_aprobado_austra || '',
          'UF Aprobado Casa Pronta': l.uf_aprobado_casa_pronta || '',
          'UF Propiedad que Quiere': l.uf_propiedad_quiere || '',
          'Con Codeudor': l.con_codeudor ? 'Si' : 'No',
          Prioridad: l.priority,
          'Fecha Aprobacion': l.fecha_aprobacion ? new Date(l.fecha_aprobacion).toLocaleDateString('es-CL') : '',
          'Dias desde Aprobacion': l.fecha_aprobacion ? Math.floor((Date.now() - new Date(l.fecha_aprobacion).getTime()) / 86400000) : '',
          'Dias Restantes (30d)': l.fecha_aprobacion ? Math.max(0, 30 - Math.floor((Date.now() - new Date(l.fecha_aprobacion).getTime()) / 86400000)) : '',
          'Fecha Creacion': new Date(l.created_at).toLocaleString('es-CL'),
          'Ultimo Cambio': l.status_changed_at ? new Date(l.status_changed_at).toLocaleString('es-CL') : '',
          'Ultimo Intento': l.last_attempt_at ? new Date(l.last_attempt_at).toLocaleString('es-CL') : '',
        };

        // Add notes in separate columns
        const notes = notesByLead[l.id] || [];
        for (let i = 0; i < maxNotes; i++) {
          row[`Nota ${i + 1}`] = notes[i] || '';
        }

        return row;
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto-width columns
      if (rows.length > 0) {
        const colWidths = Object.keys(rows[0]).map(key => ({
          wch: Math.max(key.length, ...rows.slice(0, 50).map(r => String(r[key] ?? '').length)) + 2,
        }));
        ws['!cols'] = colWidths;
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Leads');

      const dateStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `leads_${dateStr}.xlsx`, { bookType: 'xlsx' });
      toast.success(`${allLeads.length} leads descargados`);
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Error al descargar');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5 bg-green-500 hover:bg-green-600 text-white">
          <Download className="h-3.5 w-3.5" />
          Descargar Reporte Completo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar Leads</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Descarga todos los leads (ejecutiva + seguimiento) con notas en formato Excel. Puedes filtrar por fecha.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="from-date" className="text-xs">Desde</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={e => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to-date" className="text-xs">Hasta</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={e => setToDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => handleDownload(false)}
            disabled={downloading}
            className="w-full sm:w-auto"
          >
            {downloading ? 'Descargando...' : 'Descargar todos'}
          </Button>
          <Button
            onClick={() => handleDownload(true)}
            disabled={(!fromDate && !toDate) || downloading}
            className="w-full sm:w-auto"
          >
            {downloading ? 'Descargando...' : 'Descargar por fechas'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDownloadDialog;
