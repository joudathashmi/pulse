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
    definition: 'Total GFCF under SNA 2008: construction and structures, machinery and equipment, intellectual property, and cultivated biological assets.',
    source: 'GASTAT national accounts · synthetic forecast overlay on this host',
    method: 'SNA 2008',
    calculatedAt: '2026-08-12T09:41:00+03:00',
    calculatedLabel: '09:41, 12 Aug 2026',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Quarterly'
  },
  pace: {
    id: 'pace',
    name: 'Pace of year',
    definition: 'How fast certified FDI is running versus the 2026 target. 1.0x is on track to hit the year. Below 1.0x means the remaining year has to run faster.',
    source: 'Certified FDI headline vs 2026 target',
    method: 'Current certified print / implied year-end run-rate',
    calculatedAt: '2026-08-12T09:41:00+03:00',
    calculatedLabel: 'Pack cycle',
    owner: 'Economic Affairs',
    unit: 'x',
    frequency: 'Quarterly'
  },
  'target-pct': {
    id: 'target-pct',
    name: 'Share of 2026 target',
    definition: 'Certified headline as a percent of the 2026 year target on this pack. It is progress against the signed target, not a new forecast.',
    source: 'Certified Pulse / 2026 target',
    method: 'Headline / year target',
    calculatedAt: '2026-08-12T09:41:00+03:00',
    calculatedLabel: 'Pack cycle',
    owner: 'Economic Affairs',
    unit: '%',
    frequency: 'Quarterly'
  },
  year: {
    id: 'year',
    name: 'Selected year',
    definition: 'The year on the FDI cut. 2016-2024 is the public Inflows / Invest Saudi country sheet. 2026 is the Indicators pack, including synthetic forecast columns on this host.',
    source: 'Year selector on FDI',
    method: 'As published for that vintage',
    calculatedAt: '-',
    calculatedLabel: 'Selected cut',
    owner: 'Economic Affairs',
    unit: '',
    frequency: 'Annual'
  },
  stock: {
    id: 'stock',
    name: 'FDI stock',
    definition: 'The published FDI position for the selected counterpart or national total, in SAR billion.',
    source: 'Invest Saudi · investsaudi.sa/fdi',
    method: 'Published stock',
    calculatedAt: '-',
    calculatedLabel: 'Selected year',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Annual'
  },
  inflow: {
    id: 'inflow',
    name: 'FDI inflow',
    definition: 'Gross inflow from the immediate country, as published on the FDI Insights sheet, in SAR billion.',
    source: 'Invest Saudi · investsaudi.sa/fdi',
    method: 'Published inflow',
    calculatedAt: '-',
    calculatedLabel: 'Selected year',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Annual'
  },
  netflow: {
    id: 'netflow',
    name: 'Net flow',
    definition: 'Inflow minus outflow for that counterpart in the selected year, in SAR billion.',
    source: 'Invest Saudi · investsaudi.sa/fdi',
    method: 'Published net',
    calculatedAt: '-',
    calculatedLabel: 'Selected year',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Annual'
  },
  'fdi-q1': {
    id: 'fdi-q1',
    name: 'FDI net · Q1 actual',
    definition: 'Issued GASTAT net FDI for Q1 on the Indicators pack. Issued actuals stay as issued.',
    source: 'GASTAT · Indicators pack',
    method: 'IMF BPM6',
    calculatedAt: '2026-08-12T09:41:00+03:00',
    calculatedLabel: 'Issued actual',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Quarterly'
  },
  'fdi-q2': {
    id: 'fdi-q2',
    name: 'FDI net · Q2 synthetic forecast',
    definition: 'Populated synthetic forecast on this host while GASTAT has not issued Q2. Not a MISA calculation. It does not overwrite the certified Pulse.',
    source: 'Indicators pack · synthetic overlay',
    method: 'Held open until issued',
    calculatedAt: '-',
    calculatedLabel: 'Not issued',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Quarterly'
  },
  'fdi-stock-2025': {
    id: 'fdi-stock-2025',
    name: 'Stock to 2025',
    definition: 'Cumulative FDI stock to 2025 on the Indicators pack, in SAR billion.',
    source: 'Indicators pack',
    method: 'Cumulative stock',
    calculatedAt: '-',
    calculatedLabel: 'Pack vintage',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Annual'
  },
  nowcast: {
    id: 'nowcast',
    name: 'In-quarter estimate',
    definition: 'On this hosted prototype the in-quarter path is a populated synthetic estimate. It is not a MISA calculation. It never replaces the official GASTAT print.',
    source: 'Prototype nowcast path',
    method: 'Synthetic populated path',
    calculatedAt: '-',
    calculatedLabel: 'This host',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Weekly path'
  },
  official: {
    id: 'official',
    name: 'Official print',
    definition: 'The issued GASTAT figure for the quarter. The estimate never replaces this number.',
    source: 'GASTAT',
    method: 'Official dissemination',
    calculatedAt: '-',
    calculatedLabel: 'Issued print',
    owner: 'Economic Affairs',
    unit: 'SAR bn',
    frequency: 'Quarterly'
  },
  open: {
    id: 'open',
    name: 'Open',
    definition: 'Signals still waiting on an owner this cycle. Open the card to assign or close them.',
    source: 'Work on the pack',
    method: 'Alert queue',
    calculatedAt: '-',
    calculatedLabel: 'This cycle',
    owner: 'Named steward',
    unit: 'count',
    frequency: 'Live'
  },
  overdue: {
    id: 'overdue',
    name: 'Overdue',
    definition: 'Signals past their due date. They stay on Alerts until someone acts.',
    source: 'Work on the pack',
    method: 'Alert queue',
    calculatedAt: '-',
    calculatedLabel: 'This cycle',
    owner: 'Named steward',
    unit: 'count',
    frequency: 'Live'
  },
  quarantine: {
    id: 'quarantine',
    name: 'Quarantine',
    definition: 'A held value. It does not enter the certified Pulse until the owner clears it.',
    source: 'Quality gates',
    method: 'DQAF hold',
    calculatedAt: '-',
    calculatedLabel: 'This cycle',
    owner: 'Named steward',
    unit: 'count',
    frequency: 'Live'
  },
  actions: {
    id: 'actions',
    name: 'Actions',
    definition: 'Next steps assigned on this pack. Open the card to take the action.',
    source: 'Work on the pack',
    method: 'Assignment queue',
    calculatedAt: '-',
    calculatedLabel: 'This cycle',
    owner: 'Named steward',
    unit: 'count',
    frequency: 'Live'
  },
  dqaf: {
    id: 'dqaf',
    name: 'DQAF gate',
    definition: 'IMF Data Quality Assessment Framework. Six gates. A machine flags. A named person signs. Held cases do not move the gold ring.',
    source: 'Quality desk',
    method: 'IMF DQAF',
    calculatedAt: '-',
    calculatedLabel: 'This cycle',
    owner: 'Data steward',
    unit: 'count',
    frequency: 'Live'
  },
  'inv-metrics': {
    id: 'inv-metrics',
    name: 'Metrics',
    definition: 'Count of ministry metrics in the indicator workbook. The Pulse board shows only the certified pack: 2 headlines and 20 leading signals.',
    source: 'Indicator inventory workbook',
    method: 'Catalogue count',
    calculatedAt: '-',
    calculatedLabel: 'Workbook load',
    owner: 'Data steward',
    unit: 'count',
    frequency: 'As loaded'
  },
  'inv-available': {
    id: 'inv-available',
    name: 'Available',
    definition: 'Inventory rows marked available. Availability on this list is not certification. A steward still has to pass the six DQAF gates.',
    source: 'Indicator inventory workbook',
    method: 'Availability flag',
    calculatedAt: '-',
    calculatedLabel: 'Workbook load',
    owner: 'Data steward',
    unit: 'count',
    frequency: 'As loaded'
  },
  'inv-owner': {
    id: 'inv-owner',
    name: 'No owner',
    definition: 'Inventory rows with no clear owner. They cannot enter Pulse until a named steward is assigned.',
    source: 'Indicator inventory workbook',
    method: 'Gap flag',
    calculatedAt: '-',
    calculatedLabel: 'Workbook load',
    owner: 'Data steward',
    unit: 'count',
    frequency: 'As loaded'
  },
  'inv-sharing': {
    id: 'inv-sharing',
    name: 'Sharing',
    definition: 'Inventory rows waiting on a sharing mechanism. The series exists but cannot yet be certified onto the board.',
    source: 'Indicator inventory workbook',
    method: 'Gap flag',
    calculatedAt: '-',
    calculatedLabel: 'Workbook load',
    owner: 'Data steward',
    unit: 'count',
    frequency: 'As loaded'
  },
  current: {
    id: 'current',
    name: 'Current ratio',
    definition: 'Current assets divided by current liabilities. Liquidity on the selected filing. Extracted here only. It never writes the certified Pulse.',
    source: 'Selected IFRS filing',
    method: 'IAS 1 · current assets / current liabilities',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: 'x',
    frequency: 'Filing period'
  },
  quick: {
    id: 'quick',
    name: 'Quick ratio',
    definition: '(Current assets minus inventory) divided by current liabilities. A tighter liquidity read than the current ratio.',
    source: 'Selected IFRS filing',
    method: '(Current assets - inventory) / current liabilities',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: 'x',
    frequency: 'Filing period'
  },
  de: {
    id: 'de',
    name: 'Debt to equity',
    definition: 'Total liabilities divided by equity. Leverage on the selected filing.',
    source: 'Selected IFRS filing',
    method: 'Total liabilities / equity',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: 'x',
    frequency: 'Filing period'
  },
  roe: {
    id: 'roe',
    name: 'Return on equity',
    definition: 'Net profit divided by equity. Profitability for the owners of the selected filing.',
    source: 'Selected IFRS filing',
    method: 'Net profit / equity',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: '%',
    frequency: 'Filing period'
  },
  roa: {
    id: 'roa',
    name: 'Return on assets',
    definition: 'Net profit divided by total assets. How much profit the filing earns on the asset base.',
    source: 'Selected IFRS filing',
    method: 'Net profit / total assets',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: '%',
    frequency: 'Filing period'
  },
  gross: {
    id: 'gross',
    name: 'Gross margin',
    definition: 'Gross profit divided by revenue.',
    source: 'Selected IFRS filing',
    method: 'Gross profit / revenue',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: '%',
    frequency: 'Filing period'
  },
  opm: {
    id: 'opm',
    name: 'Operating margin',
    definition: 'Operating profit divided by revenue.',
    source: 'Selected IFRS filing',
    method: 'Operating profit / revenue',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: '%',
    frequency: 'Filing period'
  },
  npm: {
    id: 'npm',
    name: 'Net margin',
    definition: 'Net profit divided by revenue.',
    source: 'Selected IFRS filing',
    method: 'Net profit / revenue',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: '%',
    frequency: 'Filing period'
  },
  revenue: {
    id: 'revenue',
    name: 'Revenue',
    definition: 'Revenue for the period, mapped from the statement of profit or loss on the selected filing.',
    source: 'Selected IFRS filing',
    method: 'IAS 1 mapping',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: 'filing unit',
    frequency: 'Filing period'
  },
  net_profit: {
    id: 'net_profit',
    name: 'Profit for the year',
    definition: 'Profit for the period after zakat and tax, mapped from the selected filing.',
    source: 'Selected IFRS filing',
    method: 'IAS 1 mapping',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: 'filing unit',
    frequency: 'Filing period'
  },
  total_assets: {
    id: 'total_assets',
    name: 'Total assets',
    definition: 'Total assets on the statement of financial position for the selected filing.',
    source: 'Selected IFRS filing',
    method: 'IAS 1 mapping',
    calculatedAt: '-',
    calculatedLabel: 'This filing',
    owner: 'FSA desk',
    unit: 'filing unit',
    frequency: 'Filing period'
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
