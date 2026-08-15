/**
 * KPI registry - definition, source, calculation stamp for signature marks.
 * Traceable: every Pulse KPI resolves here.
 */
export const KPI_META = {
  fdi: {
    id: 'fdi',
    name: 'Foreign Direct Investment (net)',
    definition: 'Net FDI under IMF BPM6 / OECD BD5: equity capital + reinvested earnings + debt instruments, directional, after outflow.',
    source: 'GASTAT · SAMA balance of payments',
    method: 'IMF BPM6 · OECD BD5',
    calculatedAt: '2026-08-12T09:41:00+03:00',
    calculatedLabel: '09:41, 12 Aug 2026',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Quarterly'
  },
  gfcf: {
    id: 'gfcf',
    name: 'Gross Fixed Capital Formation',
    definition: 'Total GFCF under SNA 2008: construction & structures, machinery & equipment, intellectual property, and cultivated biological assets.',
    source: 'GASTAT national accounts · synthetic forecast overlay on this host',
    method: 'SNA 2008',
    calculatedAt: '2026-08-12T09:41:00+03:00',
    calculatedLabel: '09:41, 12 Aug 2026',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Quarterly'
  }
};

/** Enrich a signal id with a default definition when pack metadata is thin. */
export function signalMeta(sig) {
  if (!sig) return null;
  return {
    id: sig.id,
    name: sig.name,
    definition: sig.definition || `Leading indicator “${sig.name}” used for early signal on ${(sig.metric || 'investment').toUpperCase()}. Impact recorded as ${sig.impact || sig.status}.`,
    source: sig.source || 'Performance pack',
    method: sig.freq || 'As published',
    calculatedAt: sig.period || '-',
    calculatedLabel: sig.period ? `Last reading · ${sig.period}` : 'Pack cycle',
    owner: sig.source || 'Steward',
    unit: '',
    frequency: sig.freq || '-'
  };
}

export function getKpiMeta(id, brief) {
  if (KPI_META[id]) {
    const base = { ...KPI_META[id] };
    const h = brief?.headlines?.[id];
    if (h) {
      base.source = h.source || base.source;
      base.owner = h.owner || base.owner;
      base.method = h.method || base.method;
    }
    return base;
  }
  const sig = (brief?.signals || []).find(s => s.id === id);
  return signalMeta(sig);
}
