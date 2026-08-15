/** Drill hierarchy with per-child certification for DEC-12 roll-up. */
export const LEVELS = {
  fdi: {
    name: 'Foreign Direct Investment',
    nameAr: 'الاستثمار الأجنبي المباشر',
    method: 'IMF BPM6 · OECD BD5',
    owner: 'Economic Affairs & Investment Studies Agency',
    source: 'GASTAT · SAMA balance of payments',
    state: 'Provisional · certified',
    components: [
      ['Equity capital', 16.4, 'Available', 'Direct equity stakes and capital increases', true],
      ['Reinvested earnings', 14.1, 'Partial · modelled', 'Retained earnings attributed to foreign parents', false],
      ['Debt instruments', 8.4, 'Available', 'Related-party loans and debt securities', true]
    ]
  },
  gfcf: {
    name: 'Gross Fixed Capital Formation',
    nameAr: 'تكوين رأس المال الثابت الإجمالي',
    method: 'SNA 2008',
    owner: 'Economic Affairs & Investment Studies Agency',
    source: 'GASTAT national accounts',
    state: 'Provisional · certified',
    components: [
      ['Construction and structures', 206, 'Available', 'Buildings, civil works, mega-project structures', true],
      ['Machinery and equipment', 118, 'Available', 'Plant, transport and ICT equipment', true],
      ['Intellectual property', 41, 'Partial', 'R&D, software and mineral exploration', false],
      ['Cultivated biological assets', 14, 'Available', 'Livestock and orchard growth', true]
    ]
  }
};

export function isParentCertified(metricId) {
  const head = LEVELS[metricId];
  if (!head) return false;
  return head.components.every(c => c[4] === true);
}

export const SECTORS = [
  ['Manufacturing', 9.1, 'ISIC C', '+12% YoY', 'Chemicals, metals, food processing'],
  ['Information and communication', 7.4, 'ISIC J', '+18% YoY', 'Telecom, software, data centres'],
  ['Professional and technical', 5.2, 'ISIC M', '+6% YoY', 'Consulting, engineering, R&D services'],
  ['Wholesale and retail', 4.8, 'ISIC G', '−2% YoY', 'Trade platforms and distribution'],
  ['Transport and storage', 4.1, 'ISIC H', '+9% YoY', 'Logistics, ports, warehousing'],
  ['Other sectors', 8.3, '-', '+4% YoY', 'Residual industries below disclosure threshold']
];

export const RECORDS = [
  {
    id: 'TX-2026-01-004182',
    type: 'Equity increase',
    region: 'Riyadh',
    date: '2026-02-11',
    value: 1.42,
    evidence: 'Bank transfer record',
    investor: 'Northbridge Capital Partners',
    entity: 'Riyadh Advanced Materials Co.',
    steward: 'Economic Affairs · Desk 4',
    lineage: 'SAMA BoP feed → reconciliation → certified store'
  },
  {
    id: 'TX-2026-01-004183',
    type: 'Equity increase',
    region: 'Eastern Province',
    date: '2026-02-14',
    value: 0.86,
    evidence: 'Bank transfer record',
    investor: 'Gulf Industrial Holdings',
    entity: 'Eastern Petrochem JV',
    steward: 'Economic Affairs · Desk 2',
    lineage: 'SAMA BoP feed → reconciliation → certified store'
  },
  {
    id: 'TX-2026-01-004201',
    type: 'Related-party debt',
    region: 'Riyadh',
    date: '2026-02-19',
    value: 0.51,
    evidence: 'Audited statement',
    investor: 'Parent: Horizon ME Holdings',
    entity: 'Horizon KSA Distribution',
    steward: 'Economic Affairs · Desk 4',
    lineage: 'Audited FS upload → BPM6 map → certified store'
  },
  {
    id: 'TX-2026-01-004233',
    type: 'Reinvested earnings',
    region: 'Makkah',
    date: '2026-03-02',
    value: 0.34,
    evidence: 'Modelled · income approach',
    investor: 'Attributed foreign parent',
    entity: 'Red Sea Logistics Group',
    steward: 'Methodology board',
    lineage: 'Income approach model → steward review → provisional'
  },
  {
    id: 'TX-2026-01-004291',
    type: 'Equity increase',
    region: 'Madinah',
    date: '2026-03-08',
    value: 0.72,
    evidence: 'Share register extract',
    investor: 'Atlas Sovereign Fund',
    entity: 'Madinah Tech Assemblies',
    steward: 'Economic Affairs · Desk 1',
    lineage: 'Share register → BPM6 map → certified store'
  },
  {
    id: 'TX-2026-01-004310',
    type: 'Debt instruments',
    region: 'Eastern Province',
    date: '2026-03-12',
    value: 0.48,
    evidence: 'Loan agreement',
    investor: 'Intercompany facility',
    entity: 'Eastern Grid Components',
    steward: 'Economic Affairs · Desk 2',
    lineage: 'Facility notice → reconciliation → certified store'
  }
];
