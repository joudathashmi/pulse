/** Resolve a Pulse number back to the Indicators_full_2026 workbook row. */

export function packFile(pack) {
  return pack?.source || {
    file: 'Indicators_full_2026(v112082026).xlsx',
    sheet: 'FDI و GFCF التفصيلية',
    owners: 'Synthetic forecast · GASTAT actual'
  };
}

export function packMetric(pack, id) {
  if (id === 'fdi') return pack?.fdi;
  if (id === 'gfcf') return pack?.gfcf;
  return null;
}

export function packPeriod(pack, id, periodId) {
  return packMetric(pack, id)?.rows?.find(r => r.id === periodId) || null;
}

export function packSignal(pack, id) {
  return (pack?.signals || []).find(s => s.id === id) || null;
}

export function fdiFields(row) {
  return [
    { id: 'inflowF', label: 'Inflow forecast', value: row.inflowF, role: 'Synthetic populated forecast' },
    { id: 'inflowA', label: 'Inflow actual', value: row.inflowA, role: 'GASTAT actual' },
    { id: 'outflowF', label: 'Outflow forecast', value: row.outflowF, role: 'Synthetic populated forecast' },
    { id: 'outflowA', label: 'Outflow actual', value: row.outflowA, role: 'GASTAT actual' },
    { id: 'netF', label: 'Net forecast', value: row.netF, role: 'Synthetic populated forecast' },
    { id: 'netA', label: 'Net actual', value: row.netA, role: 'GASTAT actual' }
  ];
}

export function gfcfFields(row) {
  return [
    { id: 'forecast', label: 'Forecast', value: row.forecast, role: 'Synthetic populated forecast' },
    { id: 'actual', label: 'Actual', value: row.actual, role: 'GASTAT actual' }
  ];
}

export function fieldState(row, field) {
  const actual = field.id.endsWith('A') || field.id === 'actual';
  if (actual && !row.issued) return 'Not issued';
  if (field.value == null || field.value === '') return 'Blank in sheet';
  return row.issued && actual ? 'Issued' : 'On the sheet';
}
