var SHEET_ID   = '1-4P46BFU5AdixaNDn-5YCA79oCYndtv3XcRRbDKXMZ4';
var SHEET_NAME = 'Leads Web';
var SUPA_URL   = 'https://unptkiyggkuxtkzedluv.supabase.co/rest/v1/leasing_leads';
var SUPA_KEY   = 'sb_publishable_PBDA1EmrPJuzgK_qIEjsTA_eIjuUF5s';

var HEADERS = [
  'Fecha/Hora',
  'Nombre',
  'Teléfono',
  'Email',
  'Fuente',
  'Sueldo Líquido',
  'Arriendo Actual',
  'DICOM',
  'Contrato Indefinido',
  'Tiene Vivienda',
  'Ahorro'
];

function syncLeads() {
  var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);

  // Crear o actualizar encabezados
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setBackground('#1B3A6B')
      .setFontColor('#FFFFFF')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  // Teléfono como texto para no perder el +56
  sheet.getRange('C:C').setNumberFormat('@');

  var props    = PropertiesService.getScriptProperties();
  var lastSync = props.getProperty('last_sync') || '1970-01-01T00:00:00Z';
  var url      = SUPA_URL
    + '?created_at=gt.' + encodeURIComponent(lastSync)
    + '&order=created_at.asc&limit=500';

  var res = UrlFetchApp.fetch(url, {
    headers: {
      'apikey':        SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY
    }
  });

  var rows = JSON.parse(res.getContentText());
  if (!rows.length) {
    Logger.log('Sin leads nuevos desde ' + lastSync);
    return;
  }

  for (var i = 0; i < rows.length; i++) {
    var r  = rows[i];
    var ts = Utilities.formatDate(
      new Date(r.created_at), 'America/Santiago', 'dd/MM/yyyy HH:mm:ss'
    );

    var dicomVal    = r.dicom    === 'si' ? 'Sí' : r.dicom    === 'no' ? 'No' : '';
    var contratoVal = r.contrato === 'si' ? 'Sí' : r.contrato === 'no' ? 'No' : '';
    var viviendaVal = r.vivienda === 'si' ? 'Sí' : r.vivienda === 'no' ? 'No' : '';

    sheet.appendRow([
      ts,
      r.nombre   || '',
      r.telefono || '',
      r.email    || '',
      r.fuente   || '',
      r.renta    || '',
      r.arriendo || '',
      dicomVal,
      contratoVal,
      viviendaVal,
      r.ahorro   || ''
    ]);
  }

  var lastTs = rows[rows.length - 1].created_at;
  props.setProperty('last_sync', lastTs.replace('+00:00', 'Z'));
  Logger.log('Sincronizados ' + rows.length + ' leads.');
}

// Ejecuta esto una sola vez si quieres volver a importar todos los leads desde el inicio
function resetSync() {
  PropertiesService.getScriptProperties().deleteProperty('last_sync');
  Logger.log('last_sync reseteado. Próxima ejecución traerá todos los leads.');
}
