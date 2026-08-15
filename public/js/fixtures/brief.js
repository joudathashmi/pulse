/**
 * July 2026 organisational performance brief - meeting 5.
 * Source: وزارة الاستثمار · مستوى تقدم الأداء للوحدات التنظيمية · يوليو 2026.
 * Values SAR bn unless noted. null = not yet issued by GASTAT.
 */
export const BRIEF = {
  meeting: 'Meeting 5',
  meetingAr: 'الاجتماع الخامس',
  asOf: 'July 2026',
  asOfAr: 'يوليو 2026',
  classification: 'Confidential',
  classificationAr: 'مؤتمن',
  strategy: 'National Investment Strategy · Vision 2030',
  strategyAr: 'الاستراتيجية الوطنية للاستثمار · رؤية 2030',

  gfcf: {
    id: 'gfcf',
    name: 'Gross Fixed Capital Formation',
    nameAr: 'إجمالي تكوين رأس المال الثابت',
    method: 'SNA 2008',
    q1Actual: 348,
    q1Forecast: 358,
    q2Forecast: 340,
    q2Actual: null,
    h1Forecast: 698,
    target2026: 1260,
    cumulativeTarget2030Tn: 12.4,
    cumulativeActual2025Tn: 6.1,
    note: 'Q2 actual not yet issued by GASTAT',
    noteAr: 'لم يتم إصدار القيم الفعلية للربع الثاني من هيئة الإحصاء'
  },

  fdi: {
    id: 'fdi',
    name: 'Foreign Direct Investment',
    nameAr: 'الاستثمار الأجنبي المباشر',
    method: 'IMF BPM6',
    q1ForecastLow: 22,
    q1ForecastHigh: 24.5,
    q2Forecast: 27.7,
    h1Forecast: 54,
    inflowQ1: 26.6,
    outflowQ1: 3.5,
    netQ1: 23.1,
    q2Actual: null,
    target2026: 175.6,
    cumulativeTarget2030Tn: 1.8,
    cumulativeActual2025Bn: 592,
    note: 'Q2 actual not yet issued by GASTAT',
    noteAr: 'لم يتم إصدار القيم الفعلية للربع الثاني من هيئة الإحصاء'
  }
};

/** Leading indicators with impact on FDI / GFCF - from the same brief. */
export const LEADING = [
  {
    id: 'pmi',
    name: 'Purchasing Managers Index (non-oil)',
    nameAr: 'مؤشر مديري المشتريات (القطاعات غير النفطية)',
    source: 'Banque Riyad',
    freq: 'Monthly',
    impact: 'positive',
    scope: ['fdi', 'gfcf'],
    latest: '56.3',
    period: 'Jun-26',
    delta: '+0.5 pts',
    series: [56.3, 56.1, 48.8, 51.5, 52.8, 53.3]
  },
  {
    id: 'bci',
    name: 'Business confidence',
    nameAr: 'مؤشر ثقة الأعمال',
    source: 'GASTAT',
    freq: 'Monthly',
    impact: 'positive',
    scope: ['fdi', 'gfcf'],
    latest: '56.6',
    period: 'Jun-26',
    delta: '+1.0 pts',
    series: [62, 61.6, 60.7, 52.1, 54.5, 55.6, 56.6]
  },
  {
    id: 'sme',
    name: 'SME credit facilities share',
    nameAr: 'حجم التسهيلات المقدمة للمنشآت الصغيرة والمتوسطة',
    source: 'SAMA',
    freq: 'Quarterly',
    impact: 'positive',
    scope: ['gfcf'],
    latest: '11.85%',
    period: 'Q1-26',
    delta: '+0.32 pp',
    series: [10.06, 10.8, 11.18, 11.53, 11.85]
  },
  {
    id: 'pif',
    name: 'PIF capital expenditure',
    nameAr: 'المصروفات الرأسمالية لصندوق الاستثمارات العامة',
    source: 'PIF',
    freq: 'Quarterly',
    impact: 'positive',
    scope: ['gfcf'],
    latest: '22.3',
    period: 'Q1-26',
    delta: '−19.7',
    series: [10.5, 31.83, 59.9, 42, 22.3]
  },
  {
    id: 'regs',
    name: 'Investment registrations',
    nameAr: 'عدد السجلات الاستثمارية',
    source: 'MISA',
    freq: 'Monthly',
    impact: 'positive',
    scope: ['fdi'],
    latest: '3,119',
    period: 'Jun-26',
    delta: '+590',
    series: [2560, 2488, 2580, 3373, 2529, 3119]
  },
  {
    id: 'imports',
    name: 'Total imports',
    nameAr: 'إجمالي الواردات',
    source: 'GASTAT',
    freq: 'Monthly',
    impact: 'positive',
    scope: ['gfcf'],
    latest: '75,749',
    period: 'Apr-26',
    delta: '+16.2 bn',
    series: [84418, 80208, 59590, 75749]
  },
  {
    id: 'govcapex',
    name: 'Government capital expenditure',
    nameAr: 'المصروفات الرأسمالية الحكومية',
    source: 'GASTAT',
    freq: 'Quarterly',
    impact: 'watch',
    scope: ['gfcf'],
    latest: '38,338',
    period: 'Q1-26',
    delta: '−7,256',
    series: [24899, 36907, 48076, 45594, 38338]
  },
  {
    id: 'capgoods',
    name: 'Imports of capital goods',
    nameAr: 'قيمة الواردات من السلع الرأسمالية',
    source: 'GASTAT',
    freq: 'Monthly',
    impact: 'positive',
    scope: ['gfcf'],
    latest: '21,481',
    period: 'Apr-26',
    delta: '+5,540.5 m',
    series: [21698, 20336, 15940, 21481]
  },
  {
    id: 'env',
    name: 'Composite investment environment',
    nameAr: 'مؤشر البيئة الاستثمارية المركب',
    source: 'MISA',
    freq: 'Annual',
    impact: 'negative',
    scope: ['fdi', 'gfcf'],
    latest: '61.8',
    period: '2025',
    delta: '−1.7 pts',
    series: [59.8, 61.9, 63.5, 61.8]
  },
  {
    id: 'tasi',
    name: 'Equity market index',
    nameAr: 'أداء مؤشر سوق الأسهم',
    source: 'Tadawul',
    freq: 'Monthly',
    impact: 'negative',
    scope: ['fdi'],
    latest: '10,800',
    period: 'Jun-26',
    delta: '−278',
    series: [11382, 10709, 11250, 11188, 11078, 10800]
  },
  {
    id: 'investor',
    name: 'Investor confidence',
    nameAr: 'مؤشر ثقة المستثمر',
    source: 'MISA',
    freq: 'Semi-annual',
    impact: 'positive',
    scope: ['fdi'],
    latest: '0.68',
    period: 'H1-26',
    delta: '+0.02',
    series: [0.66, 0.65, 0.67, 0.66, 0.68]
  },
  {
    id: 'cds',
    name: 'CDS spreads',
    nameAr: 'هوامش عقود مبادلة مخاطر الائتمان (CDS)',
    source: 'Bloomberg',
    freq: 'Monthly',
    impact: 'positive',
    scope: ['fdi'],
    latest: '59.8',
    period: 'Jun-26',
    delta: '−1.5',
    series: [73.6, 82.6, 85.3, 67.5, 61.3, 59.8]
  }
];
