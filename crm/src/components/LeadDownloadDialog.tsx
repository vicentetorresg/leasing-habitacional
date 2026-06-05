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
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface LeadDownloadDialogProps {
  leads: Lead[];
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  calling: 'Llamando',
  first_call: '1er Llamado',
  second_call: '2do Llamado',
  recontactar: 'Recontactar',
  asesoria_agendada: 'Asesoría Agendada',
  asesoria_concretada: 'Asesoría Concretada',
  disqualified: 'No Califica',
  bad_number: 'Nro Malo / No Invierte',
  no_answer: 'No Contestó',
  reciclado: 'Reciclado',
};

const LeadDownloadDialog = ({ leads }: LeadDownloadDialogProps) => {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const handleDownload = (useFilter: boolean) => {
    let filtered = leads;

    if (useFilter && fromDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      filtered = filtered.filter(l => new Date(l.created_at) >= from);
    }
    if (useFilter && toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(l => new Date(l.created_at) <= to);
    }

    if (filtered.length === 0) {
      toast.error('No hay leads para descargar con ese filtro');
      return;
    }

    const rows = filtered.map(l => ({
      Nombre: l.name,
      Teléfono: l.phone,
      Email: l.email || '',
      RUT: l.rut || '',
      Estado: STATUS_LABELS[l.status] || l.status,
      Fuente: l.source,
      'Renta Líquida': l.sueldo_liquido_raw || (l.sueldo_liquido ? `$${l.sueldo_liquido.toLocaleString('es-CL')}` : ''),
      DICOM: l.en_dicom ? 'Sí' : 'No',
      Proyecto: l.proyecto || '',
      Prioridad: l.priority,
      'Fecha Creación': new Date(l.created_at).toLocaleString('es-CL'),
      'Último Cambio': l.status_changed_at ? new Date(l.status_changed_at).toLocaleString('es-CL') : '',
      'Último Intento': l.last_attempt_at ? new Date(l.last_attempt_at).toLocaleString('es-CL') : '',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-width columns
    const colWidths = Object.keys(rows[0]).map(key => ({
      wch: Math.max(key.length, ...rows.map(r => String((r as any)[key]).length).slice(0, 50)) + 2,
    }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    const dateStr = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `leads_${dateStr}.xlsx`, { bookType: 'xlsx' });
    toast.success(`${filtered.length} leads descargados`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Descargar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Descargar Leads</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            Descarga los leads visibles en formato Excel. Puedes filtrar por fecha de creación o descargar todo lo que ves.
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
            className="w-full sm:w-auto"
          >
            Descargar todo visible ({leads.length})
          </Button>
          <Button
            onClick={() => handleDownload(true)}
            disabled={!fromDate && !toDate}
            className="w-full sm:w-auto"
          >
            Descargar por fechas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LeadDownloadDialog;
