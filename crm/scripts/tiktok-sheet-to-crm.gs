/**
 * Sync leads desde Google Sheet "Leads Tiktok" → CRM Proppi (ingest-lead)
 * Sheet: Hoja 1 — columnas: A=Nombre, B=Telefono, C=Mail, D=Renta, E=Dicom, F=Enviado (auto)
 *
 * Setup:
 * 1. Extensiones → Apps Script → pegar este script
 * 2. Ejecutar syncLeadsToCRM() manualmente la primera vez (pide permisos)
 * 3. Triggers → syncLeadsToCRM → Time-driven → cada 15 minutos
 */

const INGEST_URL = "https://bzmzuoxapedvxmqcnhqq.supabase.co/functions/v1/ingest-lead";
const WEBHOOK_SECRET = "proppi-make-2025";
const SHEET_NAME = "Hoja 1";
const STATUS_COL = 6; // Columna F → "Enviado"

function syncLeadsToCRM() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return; // sin datos

  const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();

  for (let i = 0; i < data.length; i++) {
    const [nombre, telefono, mail, renta, dicom, enviado] = data[i];

    // Saltar filas vacías o ya enviadas
    if (!nombre && !telefono) continue;
    if (enviado === "✓") continue;

    const payload = {
      source: "tiktok",
      name: nombre || "Sin nombre",
      phone: String(telefono || ""),
      email: mail || null,
      sueldo_liquido: renta || null,
      en_dicom: dicom
        ? String(dicom).toLowerCase().includes("si") || String(dicom).toLowerCase().includes("sí")
        : null,
      external_id: "tt-sheet-" + (i + 2), // número de fila como ID único
    };

    try {
      const response = UrlFetchApp.fetch(INGEST_URL, {
        method: "post",
        contentType: "application/json",
        headers: { "x-webhook-secret": WEBHOOK_SECRET },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
      });

      const code = response.getResponseCode();
      const row = i + 2;

      if (code === 201 || code === 200) {
        sheet.getRange(row, STATUS_COL).setValue("✓");
        Logger.log(`Fila ${row} enviada OK`);
      } else {
        sheet.getRange(row, STATUS_COL).setValue("Error " + code);
        Logger.log(`Fila ${row} error: ${response.getContentText()}`);
      }
    } catch (e) {
      Logger.log("Error fila " + (i + 2) + ": " + e.message);
    }

    Utilities.sleep(300); // pausa entre llamadas
  }
}
