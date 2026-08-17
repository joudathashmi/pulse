/**
 * Ministry of Commerce iFile / XBRL Excel (mci-sas, mci-dei).
 * Official KSA IFRS filing workbook: bilingual labels, current/prior columns,
 * standalone and consolidated statement sheets.
 */
import { inflateRawSync } from 'node:zlib';

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

function parseAmount(raw) {
  if (raw == null || raw === '') return null;
  let s = String(raw).replace(/[٠-٩]/g, ch => String(AR_DIGITS.indexOf(ch))).replace(/[\s\u00a0']/g, '');
  if (!s || s === '-' || s === '—' || s === '–') return null;
  const neg = /^\(.*\)$/.test(s) || /-$/.test(s) || /^[-−–]/.test(s);
  s = s.replace(/[(),−–-]/g, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return neg ? -n : n;
}

const CONCEPT_KEY = {
  CashAndBankBalances: 'cash',
  CashAndCashEquivalents: 'cash',
  TradeAndOtherReceivables: 'receivables',
  InventoriesCurrent: 'inventory',
  Inventories: 'inventory',
  CurrentAssets: 'current_assets',
  PropertyPlantAndEquipment: 'ppe',
  IntangibleAssetsOtherThanGoodwill: 'intangibles',
  NonCurrentAssets: 'noncurrent_assets',
  Assets: 'total_assets',
  TradeAndOtherPayables: 'payables',
  DebtSecuritiesTermLoansBorrowingsAndSukuksInIssueCurrent: 'short_debt',
  CurrentLiabilities: 'current_liab',
  DebtSecuritiesTermLoansBorrowingsAndSukuksInIssueNonCurrent: 'long_debt',
  NonCurrentLiabilities: 'noncurrent_liab',
  Liabilities: 'total_liab',
  IssuedCapital: 'share_capital',
  ShareCapital: 'share_capital',
  Capital: 'share_capital',
  RetainedEarnings: 'retained',
  RetainedEarningsAccumulatedLosses: 'retained',
  Equity: 'equity',
  EquityAndLiabilities: 'equity_liab',
  LiabilitiesAndEquity: 'equity_liab',
  Revenue: 'revenue',
  CostOfSales: 'cogs',
  GrossProfitLoss: 'gross_profit',
  OperatingExpenses: 'opex',
  OperatingProfitLoss: 'operating_profit',
  FinanceCosts: 'finance_cost',
  ProfitLossBeforeZakatAndIncomeTaxContinuingOperations: 'profit_before_tax',
  ProfitLossBeforeZakatAndIncomeTax: 'profit_before_tax',
  ProfitLoss: 'net_profit',
  ProfitLossFromOperatingActivities: 'operating_profit',
  ProfitFromOperations: 'operating_profit',
  GrossProfit: 'gross_profit',
  SellingAndDistributionExpenses: 'opex',
  AdministrativeExpenses: 'opex',
  CashFlowsFromUsedInOperatingActivities: 'cfo',
  CashFlowsFromUsedInInvestingActivities: 'cfi',
  CashFlowsFromUsedInFinancingActivities: 'cff',
  IncreaseDecreaseInCashAndCashEquivalents: 'net_cash',
  RevenueFromSaleOfGoods: 'revenue',
  RevenueFromRenderingOfServices: 'revenue',
  RevenueFromConstructionContracts: 'revenue',
  OtherRevenue: 'revenue',
  NetCashFlowsFromUsedInOperatingActivities: 'cfo',
  NetCashFlowsFromUsedInInvestingActivities: 'cfi',
  NetCashFlowsFromUsedInFinancingActivities: 'cff',
  BankBalances: 'cash',
  InventoriesNonCurrent: 'inventory',
  TradeReceivables: 'receivables',
  TradePayables: 'payables',
  BorrowingsCurrent: 'short_debt',
  BorrowingsNonCurrent: 'long_debt',
  ProfitLossAttributableToOwnersOfParent: 'net_profit',
  ProfitLossFromContinuingOperations: 'net_profit'
};

const KEY_HOME = {
  cash: 'sfp', receivables: 'sfp', inventory: 'sfp', current_assets: 'sfp',
  ppe: 'sfp', intangibles: 'sfp', noncurrent_assets: 'sfp', total_assets: 'sfp',
  payables: 'sfp', short_debt: 'sfp', current_liab: 'sfp', long_debt: 'sfp',
  noncurrent_liab: 'sfp', total_liab: 'sfp', share_capital: 'sfp', retained: 'sfp',
  equity: 'sfp', equity_liab: 'sfp',
  revenue: 'pl', cogs: 'pl', gross_profit: 'pl', opex: 'pl', operating_profit: 'pl',
  finance_cost: 'pl', profit_before_tax: 'pl', zakat_tax: 'pl', net_profit: 'pl',
  cfo: 'cf', cfi: 'cf', cff: 'cf', net_cash: 'cf', cash_open: 'cf', cash_close: 'cf'
};

const FILING_FIELDS = {
  NameOfCompany: 'entity',
  CommercialRegistrationNumber: 'cr',
  LegalEntity: 'legal',
  DescriptionOfPresentationCurrencyUsedInFiling: 'currency',
  DescriptionOfPresentationCurrency: 'currency',
  LevelOfRoundingForMonetaryValues: 'rounding',
  LevelOfRoundingOffForMonetaryValues: 'rounding',
  CurrentReportingPeriodEndDate: 'periodEnd',
  PreviousReportingPeriodEndDate: 'priorEnd',
  NatureOfFinancialStatements: 'nature',
  AuditStatusOfFinancialStatements: 'auditor',
  TypeOfFiling: 'filingType',
  NameOfAuditFirm: 'auditor'
};

const FILING_LABELS = {
  'name of company': 'entity',
  'commercial registration number': 'cr',
  'legal entity': 'legal',
  'description of presentation currency': 'currency',
  'level of rounding off for monetary values': 'rounding',
  'level of rounding for monetary values': 'rounding',
  'current reporting period end date': 'periodEnd',
  'previous reporting period end date': 'priorEnd',
  'nature of financial statements': 'nature',
  'audit status of financial statements': 'auditor'
};

function foldLabel(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function applyIdentityField(identity, field, val) {
  if (!field || val == null || val === '') return;
  if (/^(خيارات اخرى|خيارات أخرى|other options|select|اختر)$/i.test(String(val).trim())) return;
  if (field === 'entity') {
    identity.entityAr = val;
    identity.entity = val;
  } else if (field === 'periodEnd') {
    const y = yearFrom(val);
    identity.periodEnd = y ? `${y}-12-31` : val;
    identity.periodLabel = y ? `FY${y}` : val;
  } else if (field === 'priorEnd') {
    identity.comparative = yearFrom(val) || val;
  } else if (field === 'currency') {
    identity.currency = /ريال|sar/i.test(val) ? 'SAR' : val;
    identity.unit = identity.currency;
  } else if (field === 'rounding') {
    if (/thousand|ألف|آلاف/i.test(val)) {
      identity.unit = "SAR '000";
      identity.unitScale = 1000;
    } else if (/million|مليون/i.test(val)) {
      identity.unit = 'SAR million';
      identity.unitScale = 1_000_000;
    } else {
      identity.unit = 'SAR';
      identity.unitScale = 1;
    }
  } else if (field === 'auditor') {
    identity.auditor = val;
  } else if (field === 'cr') {
    identity.cr = val;
  } else if (field === 'legal') {
    identity.legal = val;
  } else if (field === 'nature') {
    identity.nature = val;
  }
}

function unzip(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const entries = new Map();
  let i = 0;
  while (i < buf.length - 30) {
    const sig = buf.readUInt32LE(i);
    if (sig === 0x02014b50 || sig === 0x06054b50) break;
    if (sig !== 0x04034b50) { i += 1; continue; }
    const method = buf.readUInt16LE(i + 8);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('utf8');
    const start = i + 30 + nameLen + extraLen;
    const raw = buf.slice(start, start + compSize);
    try {
      const data = method === 0 ? raw : method === 8 ? inflateRawSync(raw) : null;
      if (data) entries.set(name, data);
    } catch { /* skip */ }
    i = start + compSize;
  }
  return entries;
}

function decodeXml(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function sharedStrings(xml) {
  const out = [];
  for (const si of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    const texts = [...si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map(m => decodeXml(m[1]));
    out.push(texts.join(''));
  }
  return out;
}

function colIndex(col) {
  let n = 0;
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

function sheetCells(xml, strings) {
  const rows = new Map();
  for (const m of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
    const attrs = m[1] || '';
    const ref = /r="([A-Z]+)(\d+)"/.exec(attrs);
    if (!ref) continue;
    const inner = m[2] || '';
    const v = (inner.match(/<v>([^<]*)<\/v>/) || [])[1];
    if (v == null && !inner) continue;
    const t = /\bt="s"/.test(attrs);
    const val = t ? (strings[Number(v)] ?? '') : (v ?? '');
    const row = Number(ref[2]);
    if (!rows.has(row)) rows.set(row, {});
    rows.get(row)[ref[1]] = String(val);
  }
  return rows;
}

function conceptName(raw) {
  const a = String(raw || '');
  const frag = a.match(/#mci-(?:sas|dei|isa)_([A-Za-z][A-Za-z0-9]*)/);
  if (frag && frag[1] !== 'core') return frag[1];
  const hit = a.match(/mci-(?:sas|dei|isa)_([A-Za-z][A-Za-z0-9]*)(?=@|$|[^A-Za-z0-9])/);
  if (hit && hit[1] !== 'core') return hit[1];
  return '';
}

function sheetKind(name, title) {
  const blob = `${name} ${title}`.toLowerCase();
  if (/filing information|بيانات الادخال|بيانات الإدخال|الصفحة الرئيسة|mainsheet|startup|\+elements|\+footnote|^data$/.test(blob)) return 'info';
  if (/audit|مراجع/.test(blob) && !/مركز مالي|ربح|تدفق|حقوق الملك/.test(blob)) return 'notes';
  if (/cash flow|تدفقات نقد/.test(blob)) return 'cf';
  if (/comprehensive income|دخل شامل/.test(blob) && !/profit or loss|ربح وخسارة|ربح و خسارة/.test(blob)) return 'oci';
  if (/profit or loss|ربح وخسارة|ربح و خسارة|قائمة الدخل|قائمة الأرباح/.test(blob)) return 'pl';
  if (/changes in equity|حقوق الملك/.test(blob)) return 'eq';
  if (/financial position|مركز مالي|قائمة المركز/.test(blob)) return 'sfp';
  return '';
}

function isConsolidated(name, title) {
  return /consolidat|موحد|موحدة/.test(`${name} ${title}`);
}

function yearFrom(v) {
  const m = String(v || '').match(/(20\d{2})/);
  return m ? m[1] : '';
}

function pickCell(row, letters) {
  for (const c of letters) {
    if (row[c] != null && String(row[c]).trim() !== '') return String(row[c]).trim();
  }
  return '';
}

export function isMciWorkbook(buffer) {
  try {
    const zip = unzip(buffer);
    const ss = zip.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    return /mci-sas_|mci-dei_|#CustPlc#|iFile/.test(ss);
  } catch {
    return false;
  }
}

export function parseMciFiling(buffer) {
  const zip = unzip(buffer);
  const strings = sharedStrings(zip.get('xl/sharedStrings.xml')?.toString('utf8') || '');
  const wb = zip.get('xl/workbook.xml')?.toString('utf8') || '';
  const rels = zip.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';
  const ridToPath = new Map();
  for (const m of rels.matchAll(/<Relationship\b([^>]+)\/>/g)) {
    const attrs = m[1];
    const id = (/Id="([^"]+)"/.exec(attrs) || [])[1];
    let t = (/Target="([^"]+)"/.exec(attrs) || [])[1] || '';
    if (!id || !t) continue;
    t = t.replace(/^\//, '');
    if (!t.startsWith('xl/')) t = `xl/${t}`;
    ridToPath.set(id, t);
  }
  const sheets = [];
  for (const m of wb.matchAll(/<sheet\b([^>]+)\/>/g)) {
    const attrs = m[1];
    const name = decodeXml((/name="([^"]+)"/.exec(attrs) || [])[1] || '');
    const rid = (/r:id="(rId\d+)"/.exec(attrs) || [])[1];
    const hidden = /state="(hidden|veryHidden)"/.test(attrs);
    const path = ridToPath.get(rid);
    if (!name || !path || !zip.has(path)) continue;
    sheets.push({ name, hidden, rows: sheetCells(zip.get(path).toString('utf8'), strings) });
  }
  if (!sheets.length) return null;

  const identity = {
    entity: '',
    entityAr: '',
    periodEnd: '',
    periodLabel: '',
    comparative: '',
    currency: 'SAR',
    unit: 'SAR',
    unitScale: 1,
    framework: 'IFRS as endorsed in KSA · MCI iFile',
    auditor: '',
    language: 'bilingual',
    country: 'SA',
    cr: '',
    legal: '',
    nature: ''
  };

  const sourceSheets = [];
  const mapped = new Map();
  const pages = [];
  let zakat = { current: null, prior: null };
  let tax = { current: null, prior: null };

  for (const sheet of sheets) {
    const cells = sheet.rows;
    const titleRow = [...cells.values()].find(r => /Statement of/i.test(r.E || ''))
      || [...cells.values()].find(r => /قائمة /.test(`${r.E || ''} ${r.F || ''}`));
    const title = /Statement of/i.test(titleRow?.E || '') ? titleRow.E : (titleRow?.E || sheet.name);
    const titleAr = /[\u0600-\u06FF]/.test(titleRow?.F || '') ? titleRow.F : (titleRow?.F || sheet.name);
    const kind = sheetKind(sheet.name, `${title} ${titleAr}`);
    if (kind === 'info') {
      for (const row of cells.values()) {
        const concept = conceptName(row.A) || conceptName(row.C);
        const field = FILING_FIELDS[concept] || FILING_LABELS[foldLabel(row.E)];
        const val = pickCell(row, ['G', 'H']);
        applyIdentityField(identity, field, val);
      }
      continue;
    }
    if (sheet.hidden) continue;
    if (!kind || kind === 'notes' || kind === 'oci') continue;
    const consolidated = isConsolidated(sheet.name, title);
    if (sourceSheets.some(s => s.id === kind && !s.consolidated) && !consolidated) continue;
    if (consolidated && sourceSheets.some(s => s.id === kind && !s.consolidated)) continue;

    const currentYear = yearFrom(titleRow?.G) || identity.periodLabel.replace('FY', '');
    const priorYear = yearFrom(titleRow?.H) || identity.comparative;
    const rows = [];
    let filled = 0;
    for (const [n, row] of [...cells.entries()].sort((a, b) => a[0] - b[0])) {
      const concept = conceptName(row.A || row.C);
      const label = String(row.E || '').trim();
      const labelAr = String(row.F || '').replace(/^\s+/, '').trim();
      if (!concept || (!label && !labelAr)) continue;
      if (/^#/.test(row.C || '')) continue;
      const current = parseAmount(row.G);
      const prior = parseAmount(row.H);
      const header = /Abstract$/.test(concept) || (current == null && prior == null && /totalLabel|terseLabel/.test(row.A || '') && !row.G && !row.H);
      const total = /totalLabel|periodEndLabel|netLabel/.test(row.A || '') || /^Total |^إجمالي |^صافي /.test(label);
      if (current != null || prior != null) filled += 1;
      rows.push({
        n: Number(row.D) || n,
        concept,
        label,
        labelAr,
        current,
        prior,
        kind: header ? 'header' : total ? 'total' : 'line'
      });

      const key = CONCEPT_KEY[concept];
      const role = String(row.A || '');
      if (concept === 'CashAndCashEquivalents' && /periodStartLabel/.test(role)) {
        mapped.set('cash_open', lineOf('cash_open', kind, label, labelAr, current, prior, n));
      } else if (concept === 'CashAndCashEquivalents' && /periodEndLabel/.test(role)) {
        mapped.set('cash_close', lineOf('cash_close', kind, label, labelAr, current, prior, n));
      } else if (concept === 'ZakatExpenseContinuingOperations' || concept === 'ZakatExpense') {
        zakat = { current, prior };
      } else if (concept === 'IncomeTaxExpenseContinuingOperations' || concept === 'IncomeTaxExpense') {
        tax = { current, prior };
      } else if (key === 'opex' && (current != null || prior != null) && (!KEY_HOME.opex || KEY_HOME.opex === kind)) {
        const prev = mapped.get('opex');
        if (concept === 'OperatingExpenses' || total) {
          mapped.set('opex', lineOf('opex', kind, label, labelAr, current, prior, n, 0.97));
        } else if (!prev || prev.confidence < 0.97) {
          mapped.set('opex', lineOf(
            'opex',
            kind,
            prev ? 'Operating expenses' : label,
            prev ? 'المصروفات التشغيلية' : labelAr,
            (prev?.current || 0) + (current || 0),
            (prev?.prior || 0) + (prior || 0),
            n,
            0.9
          ));
        }
      } else if (key && (current != null || prior != null)) {
        const home = KEY_HOME[key];
        if (home && home !== kind) {
          /* keep the line on its home statement */
        } else {
          const prev = mapped.get(key);
          if (!prev || (kind === prev.statement && total) || prev.confidence < 0.92) {
            mapped.set(key, lineOf(key, kind, label, labelAr, current, prior, n, total ? 0.97 : 0.93));
          }
        }
      }
    }

    if (!rows.length || !filled) continue;
    sourceSheets.push({
      id: kind,
      title,
      titleAr,
      currentYear,
      priorYear,
      consolidated: isConsolidated(sheet.name, title),
      rows: rows.filter(r => r.kind === 'header' || r.current != null || r.prior != null)
    });
    pages.push({
      n: pages.length + 1,
      lines: rows.filter(r => r.current != null || r.prior != null).map(r => `${r.label} ${r.current ?? ''} ${r.prior ?? ''}`),
      text: `${title}\n${titleAr}`
    });
  }

  if (zakat.current != null || tax.current != null || zakat.prior != null || tax.prior != null) {
    mapped.set('zakat_tax', lineOf(
      'zakat_tax',
      'pl',
      'Zakat and income tax',
      'الزكاة وضريبة الدخل',
      (zakat.current || 0) + (tax.current || 0),
      (zakat.prior || 0) + (tax.prior || 0),
      0,
      0.9
    ));
  }

  if (!identity.periodLabel && sourceSheets[0]?.currentYear) {
    identity.periodLabel = `FY${sourceSheets[0].currentYear}`;
    identity.comparative = sourceSheets[0].priorYear || '';
    identity.periodEnd = `${sourceSheets[0].currentYear}-12-31`;
  }

  const lines = [...mapped.values()];
  if (!lines.length && !sourceSheets.length) return null;
  return {
    identity,
    lines,
    pages: pages.length ? pages : [{ n: 1, lines: [], text: 'MCI iFile' }],
    sourceSheets,
    pack: 'mci-ifile'
  };
}

function lineOf(key, statement, label, labelAr, current, prior, page, confidence = 0.93) {
  return {
    id: `ln-${key}`,
    key,
    statement,
    label: label || key,
    labelAr: labelAr || label,
    sourceLabel: labelAr || label,
    ifrs: 'MCI iFile / IFRS',
    current,
    prior,
    page: page || 1,
    confidence
  };
}
