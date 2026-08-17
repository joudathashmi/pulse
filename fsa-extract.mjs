/**
 * IFRS financial-statement extractor.
 * PDF text via pdfjs-dist. Line items mapped through a bilingual EN/AR lexicon
 * (IAS 1 / SOCPA Arabic). Excel is read as a workbook of text rows.
 * Does not write Pulse headlines.
 */
import { inflateRawSync } from 'node:zlib';
import { isMciWorkbook, parseMciFiling } from './fsa-mci.mjs';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
GlobalWorkerOptions.workerSrc = pathToFileURL(
  require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs')
).href;

const AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';

export const STATEMENTS = [
  { id: 'sfp', ias: 'IAS 1.54', title: 'Statement of financial position', titleAr: 'قائمة المركز المالي' },
  { id: 'pl', ias: 'IAS 1.82', title: 'Statement of profit or loss', titleAr: 'قائمة الربح أو الخسارة' },
  { id: 'cf', ias: 'IAS 7', title: 'Statement of cash flows', titleAr: 'قائمة التدفقات النقدية' },
  { id: 'eq', ias: 'IAS 1.106', title: 'Statement of changes in equity', titleAr: 'قائمة التغيرات في حقوق الملكية' },
  { id: 'notes', ias: 'IAS 1.112', title: 'Notes', titleAr: 'الإيضاحات' }
];

/**
 * Longer / more specific aliases first. Arabic terms follow SOCPA / IFRS Foundation.
 */
export const TAXONOMY = [
  { key: 'cash', statement: 'sfp', ifrs: 'IAS 1.54(i)', en: 'Cash and cash equivalents', ar: 'نقد وما في حكمه',
    aliases: ['cash and cash equivalents', 'cash & cash equivalents', 'cash and bank', 'نقد وما في حكمه', 'النقد وما في حكمه', 'نقدية وما يعادلها', 'نقد لدى البنوك', 'النقدية بالصندوق ولدي البنوك', 'النقدية بالصندوق'] },
  { key: 'receivables', statement: 'sfp', ifrs: 'IAS 1.54(h)', en: 'Trade receivables', ar: 'ذمم مدينة تجارية',
    aliases: ['trade receivables', 'trade and other receivables', 'accounts receivable', 'ذمم مدينة', 'مدينون', 'ذمم مدينة تجارية'] },
  { key: 'inventory', statement: 'sfp', ifrs: 'IAS 2', en: 'Inventories', ar: 'مخزون',
    aliases: ['inventories', 'inventory', 'مخزون', 'بضاعة'] },
  { key: 'current_assets', statement: 'sfp', ifrs: 'IAS 1.66', en: 'Total current assets', ar: 'إجمالي الأصول المتداولة',
    aliases: ['total current assets', 'current assets', 'مجموع الأصول المتداولة', 'إجمالي الأصول المتداولة', 'الأصول المتداولة', 'موجودات متداولة', 'إجمالي الموجودات المتداولة'] },
  { key: 'ppe', statement: 'sfp', ifrs: 'IAS 16', en: 'Property, plant and equipment', ar: 'ممتلكات وآلات ومعدات',
    aliases: ['property plant and equipment', 'property, plant and equipment', 'ppe', 'ممتلكات وآلات ومعدات', 'ممتلكات ومعدات', 'ممتلكات ومعدات صافي'] },
  { key: 'intangibles', statement: 'sfp', ifrs: 'IAS 38', en: 'Intangible assets', ar: 'أصول غير ملموسة',
    aliases: ['intangible assets', 'intangibles', 'أصول غير ملموسة', 'موجودات غير ملموسة'] },
  { key: 'noncurrent_assets', statement: 'sfp', ifrs: 'IAS 1.66', en: 'Total non-current assets', ar: 'إجمالي الأصول غير المتداولة',
    aliases: ['total non-current assets', 'non-current assets', 'noncurrent assets', 'إجمالي الأصول غير المتداولة', 'الأصول غير المتداولة', 'موجودات غير متداولة', 'إجمالي الموجودات غير المتداولة'] },
  { key: 'total_assets', statement: 'sfp', ifrs: 'IAS 1.54', en: 'Total assets', ar: 'إجمالي الأصول',
    aliases: ['total assets', 'إجمالي الأصول', 'مجموع الأصول', 'إجمالي الموجودات', 'مجموع الموجودات'] },
  { key: 'payables', statement: 'sfp', ifrs: 'IAS 1.54(k)', en: 'Trade payables', ar: 'ذمم دائنة تجارية',
    aliases: ['trade payables', 'trade and other payables', 'accounts payable', 'ذمم دائنة', 'دائنون', 'ذمم دائنة تجارية'] },
  { key: 'short_debt', statement: 'sfp', ifrs: 'IFRS 7', en: 'Short-term borrowings', ar: 'قروض قصيرة الأجل',
    aliases: ['short-term borrowings', 'short term borrowings', 'current borrowings', 'قروض قصيرة الأجل', 'تمويل قصير الأجل'] },
  { key: 'current_liab', statement: 'sfp', ifrs: 'IAS 1.69', en: 'Total current liabilities', ar: 'إجمالي الالتزامات المتداولة',
    aliases: ['total current liabilities', 'current liabilities', 'إجمالي الالتزامات المتداولة', 'الالتزامات المتداولة', 'مطلوبات متداولة', 'إجمالي المطلوبات المتداولة'] },
  { key: 'long_debt', statement: 'sfp', ifrs: 'IFRS 7', en: 'Long-term borrowings', ar: 'قروض طويلة الأجل',
    aliases: ['long-term borrowings', 'long term borrowings', 'non-current borrowings', 'قروض طويلة الأجل', 'تمويل طويل الأجل'] },
  { key: 'noncurrent_liab', statement: 'sfp', ifrs: 'IAS 1.69', en: 'Total non-current liabilities', ar: 'إجمالي الالتزامات غير المتداولة',
    aliases: ['total non-current liabilities', 'non-current liabilities', 'إجمالي الالتزامات غير المتداولة', 'الالتزامات غير المتداولة', 'مطلوبات غير متداولة', 'إجمالي المطلوبات غير المتداولة'] },
  { key: 'total_liab', statement: 'sfp', ifrs: 'IAS 1.54', en: 'Total liabilities', ar: 'إجمالي الالتزامات',
    aliases: ['total liabilities', 'إجمالي الالتزامات', 'مجموع الالتزامات', 'إجمالي المطلوبات'] },
  { key: 'share_capital', statement: 'sfp', ifrs: 'IAS 1.54(r)', en: 'Share capital', ar: 'رأس المال',
    aliases: ['share capital', 'issued capital', 'رأس المال', 'رأس المال المصدر'] },
  { key: 'retained', statement: 'sfp', ifrs: 'IAS 1.54(r)', en: 'Retained earnings', ar: 'أرباح مبقاة',
    aliases: ['retained earnings', 'retained profits', 'أرباح مبقاة', 'أرباح محتجزة', 'الخسائر المبقاة', 'الأرباح المبقاة'] },
  { key: 'equity', statement: 'sfp', ifrs: 'IAS 1.54(r)', en: 'Total equity', ar: 'إجمالي حقوق الملكية',
    aliases: ['total equity', 'equity attributable', 'shareholders equity', 'إجمالي حقوق الملكية', 'حقوق الملكية', 'حقوق المساهمين', 'إجمالي حقوق الشركاء', 'حقوق الشركاء'] },
  { key: 'equity_liab', statement: 'sfp', ifrs: 'IAS 1.54', en: 'Total equity and liabilities', ar: 'إجمالي حقوق الملكية والالتزامات',
    aliases: ['total equity and liabilities', 'equity and liabilities', 'إجمالي حقوق الملكية والالتزامات', 'مجموع حقوق الملكية والمطلوبات', 'إجمالي المطلوبات وحقوق الشركاء'] },
  { key: 'revenue', statement: 'pl', ifrs: 'IAS 1.82(a)', en: 'Revenue', ar: 'الإيرادات',
    aliases: ['revenue', 'turnover', 'sales', 'إيرادات', 'الإيرادات', 'المبيعات', 'إجمالي الإيرادات'] },
  { key: 'cogs', statement: 'pl', ifrs: 'IAS 1.99', en: 'Cost of sales', ar: 'تكلفة الإيرادات',
    aliases: ['cost of sales', 'cost of revenue', 'cost of goods', 'تكلفة الإيرادات', 'تكلفة المبيعات', 'تكلفة الإيراد'] },
  { key: 'gross_profit', statement: 'pl', ifrs: 'IAS 1.85', en: 'Gross profit', ar: 'مجمل الربح',
    aliases: ['gross profit', 'مجمل الربح', 'الربح الإجمالي'] },
  { key: 'opex', statement: 'pl', ifrs: 'IAS 1.99', en: 'Operating expenses', ar: 'مصروفات تشغيلية',
    aliases: ['operating expenses', 'administrative expenses', 'selling and administrative', 'مصروفات تشغيلية', 'مصروفات عمومية', 'مصاريف تشغيلية'] },
  { key: 'operating_profit', statement: 'pl', ifrs: 'IAS 1.85', en: 'Operating profit', ar: 'الربح التشغيلي',
    aliases: ['operating profit', 'operating income', 'profit from operations', 'الربح التشغيلي', 'ربح التشغيل'] },
  { key: 'finance_cost', statement: 'pl', ifrs: 'IAS 1.82(b)', en: 'Finance costs', ar: 'تكاليف التمويل',
    aliases: ['finance costs', 'finance cost', 'interest expense', 'تكاليف التمويل', 'تكاليف تمويل', 'أعباء تمويل'] },
  { key: 'profit_before_tax', statement: 'pl', ifrs: 'IAS 1.85', en: 'Profit before zakat and tax', ar: 'الربح قبل الزكاة والضريبة',
    aliases: ['profit before zakat', 'profit before tax', 'profit before income', 'الربح قبل الزكاة', 'الربح قبل الضريبة'] },
  { key: 'zakat_tax', statement: 'pl', ifrs: 'IAS 12 / Zakat', en: 'Zakat and income tax', ar: 'الزكاة وضريبة الدخل',
    aliases: ['zakat and income tax', 'zakat', 'income tax', 'الزكاة وضريبة الدخل', 'الزكاة', 'ضريبة الدخل'] },
  { key: 'net_profit', statement: 'pl', ifrs: 'IAS 1.81A', en: 'Profit for the year', ar: 'ربح السنة',
    aliases: ['profit for the year', 'profit for the period', 'net profit', 'net income', 'ربح السنة', 'صافي الربح', 'صافي الدخل'] },
  { key: 'cfo', statement: 'cf', ifrs: 'IAS 7.10', en: 'Net cash from operating activities', ar: 'صافي النقد من الأنشطة التشغيلية',
    aliases: ['cash from operating', 'operating activities', 'net cash from operating', 'التدفقات من الأنشطة التشغيلية', 'الأنشطة التشغيلية', 'التشغيلية'] },
  { key: 'cfi', statement: 'cf', ifrs: 'IAS 7.10', en: 'Net cash used in investing activities', ar: 'صافي النقد من الأنشطة الاستثمارية',
    aliases: ['cash from investing', 'investing activities', 'net cash used in investing', 'الأنشطة الاستثمارية', 'الاستثمارية'] },
  { key: 'cff', statement: 'cf', ifrs: 'IAS 7.10', en: 'Net cash used in financing activities', ar: 'صافي النقد من الأنشطة التمويلية',
    aliases: ['cash from financing', 'financing activities', 'net cash used in financing', 'الأنشطة التمويلية', 'التمويلية'] },
  { key: 'net_cash', statement: 'cf', ifrs: 'IAS 7.45', en: 'Net increase in cash', ar: 'صافي التغير في النقد',
    aliases: ['net increase in cash', 'net change in cash', 'صافي التغير في النقد', 'صافي الزيادة في النقد'] },
  { key: 'cash_open', statement: 'cf', ifrs: 'IAS 7.45', en: 'Cash at beginning of period', ar: 'النقد في بداية الفترة',
    aliases: ['cash at beginning', 'cash at the beginning', 'النقد في بداية', 'نقدية أول المدة'] },
  { key: 'cash_close', statement: 'cf', ifrs: 'IAS 7.45', en: 'Cash at end of period', ar: 'النقد في نهاية الفترة',
    aliases: ['cash at end', 'cash at the end', 'النقد في نهاية', 'نقدية آخر المدة'] }
];

const HEADER_RULES = [
  { id: 'sfp', re: /statement of financial position|balance sheet|قائمة المركز المالي|المركز المالي/i },
  { id: 'pl', re: /statement of profit or loss|income statement|comprehensive income|قائمة الربح|قائمة الدخل|الربح أو الخسارة/i },
  { id: 'cf', re: /statement of cash flows|cash flow statement|قائمة التدفقات النقدية|التدفقات النقدية/i },
  { id: 'eq', re: /changes in equity|statement of changes|قائمة التغيرات في حقوق|التغيرات في حقوق الملكية|قائمة التغيرات في حقوق الشركاء/i },
  { id: 'notes', re: /notes to the financial|notes to the statements|إيضاحات حول|الإيضاحات/i }
];

export function normalizeDigits(s) {
  return String(s ?? '')
    .replace(/[٠-٩]/g, ch => String(AR_DIGITS.indexOf(ch)))
    .replace(/[٬]/g, ',')
    .replace(/[٫]/g, '.');
}

export function fold(s) {
  return normalizeDigits(s)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/(^|[^\p{L}])ال(?=\p{L})/gu, '$1')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseAmount(raw) {
  if (raw == null || raw === '') return null;
  let s = normalizeDigits(String(raw)).replace(/[\s\u00a0']/g, '');
  if (!s || s === '-' || s === '—' || s === '–') return null;
  const neg = /^\(.*\)$/.test(s) || /-$/.test(s) || /^[-−–]/.test(s);
  s = s.replace(/[(),−–-]/g, '').replace(/,/g, '');
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return neg ? -n : n;
}

function amountsIn(line) {
  const tokens = String(line).match(/\(?[-−–]?[\d٠-٩][\d٠-٩,٬'٫.]*\)?/g) || [];
  return tokens.map(parseAmount).filter(n => n != null && Number.isFinite(n));
}

function labelOf(line) {
  return String(line)
    .replace(/\(?[-−–]?[\d٠-٩][\d٠-٩,٬'٫.\s]*\)?/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchTaxonomy(label, preferred) {
  const n = fold(label);
  if (!n || n.length < 3) return null;
  const pool = preferred ? TAXONOMY.filter(t => t.statement === preferred) : TAXONOMY;
  let best = null;
  let score = 0;
  for (const row of pool) {
    for (const alias of row.aliases) {
      const a = fold(alias);
      if (!a) continue;
      if (n === a) return row;
      if (n.includes(a) || a.includes(n)) {
        const s = a.length + (n.includes(a) ? 2 : 0);
        if (s > score) {
          score = s;
          best = row;
        }
      }
    }
  }
  return best;
}

function detectHeader(line) {
  const n = fold(line);
  for (const rule of HEADER_RULES) {
    if (rule.re.test(n) || rule.re.test(line)) return rule.id;
  }
  return null;
}

function scriptOf(text) {
  const ar = (String(text).match(/[\u0600-\u06FF]/g) || []).length;
  const la = (String(text).match(/[A-Za-z]/g) || []).length;
  if (ar > 20 && la > 20) return 'bilingual';
  if (ar > la) return 'ar';
  return 'en';
}

function detectIdentity(lines, fileName) {
  const blob = lines.join('\n');
  const identity = {
    entity: '',
    entityAr: '',
    periodEnd: '',
    periodLabel: '',
    comparative: '',
    currency: 'SAR',
    unit: "SAR '000",
    unitScale: 1000,
    framework: 'IFRS',
    auditor: '',
    language: scriptOf(blob),
    country: 'SA'
  };

  if (/ifrs|المعايير الدولية|المعيار الدولي/i.test(blob)) identity.framework = 'IFRS';
  if (/socpa|الهيئة السعودية للمراجعين/i.test(blob)) identity.framework = 'IFRS as endorsed in KSA';

  if (/sar\s*'?000|sar thousands|آلاف الريالات|بالألف ريال/i.test(blob)) {
    identity.unit = "SAR '000";
    identity.unitScale = 1000;
  } else if (/sar\s*million|ملايين الريالات/i.test(blob)) {
    identity.unit = 'SAR million';
    identity.unitScale = 1_000_000;
  } else if (/\bSAR\b|ريال سعودي|ر\.س/i.test(blob)) {
    identity.unit = 'SAR';
    identity.unitScale = 1;
  }

  const end = blob.match(/31\s*(?:december|ديسمبر)\s*(20\d{2})/i)
    || blob.match(/year ended[^\n]{0,40}(20\d{2})/i)
    || blob.match(/للسنة المنتهية[^\n]{0,40}(20\d{2})/);
  if (end) {
    identity.periodEnd = `${end[1]}-12-31`;
    identity.periodLabel = `FY${end[1]}`;
    identity.comparative = String(Number(end[1]) - 1);
  }

  const years = [...blob.matchAll(/\b(20[12]\d)\b/g)].map(m => m[1]);
  const uniq = [...new Set(years)].sort();
  if (!identity.periodLabel && uniq.length) {
    identity.periodLabel = `FY${uniq.at(-1)}`;
    identity.periodEnd = `${uniq.at(-1)}-12-31`;
    identity.comparative = uniq.length > 1 ? uniq.at(-2) : String(Number(uniq.at(-1)) - 1);
  }

  const company = lines.find(l => /company|شركة|مساهمة|limited|ذ\.م\.م|distribution|holdings|group/i.test(l) && l.length < 80 && !detectHeader(l));
  if (company) {
    identity.entity = company.replace(/\s+/g, ' ').trim();
    if (/[\u0600-\u06FF]/.test(company)) identity.entityAr = identity.entity;
  }
  if (!identity.entity) {
    const title = lines.find(l =>
      l.length > 6 && l.length < 64
      && !detectHeader(l)
      && !/as at|year ended|sar|ifrs|synthetic|للسنة|ريال/i.test(l)
      && !/^\d{4}$/.test(l)
    );
    if (title) identity.entity = title.replace(/\s+/g, ' ').trim();
  }
  if (!identity.entity && fileName) {
    identity.entity = String(fileName).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
  }
  return identity;
}

function statementAmounts(line) {
  const nums = amountsIn(line);
  const big = nums.filter(n => Math.abs(n) >= 100);
  return big.length ? big : nums;
}

function stitchLines(lines) {
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (!b) {
      out.push(a);
      continue;
    }
    const aNums = statementAmounts(a);
    const bNums = statementAmounts(b);
    const aLab = fold(labelOf(a));
    const bLab = fold(labelOf(b));
    const aAmt = aNums.length >= 1 && aLab.length <= 2;
    const bAmt = bNums.length >= 1 && bLab.length <= 2;
    const aLbl = aLab.length >= 4 && aNums.length <= 1;
    const bLbl = bLab.length >= 4 && bNums.length <= 1;
    if ((aAmt && bLbl) || (aLbl && bAmt)) {
      out.push(`${a} ${b}`);
      i += 1;
      continue;
    }
    out.push(a);
  }
  return out;
}

function linesFromPdfItems(items) {
  const rows = new Map();
  for (const it of items) {
    const str = String(it.str || '').trim();
    if (!str) continue;
    const x = it.transform?.[4] ?? 0;
    const y = Math.round((it.transform?.[5] ?? 0) / 3) * 3;
    if (!rows.has(y)) rows.set(y, []);
    rows.get(y).push({ x, str });
  }
  return [...rows.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, bits]) => {
      const ordered = bits.sort((a, b) => a.x - b.x);
      const joined = ordered.map(b => b.str).join(' ');
      const ar = (joined.match(/[\u0600-\u06FF]/g) || []).length;
      const la = (joined.match(/[A-Za-z0-9]/g) || []).length;
      const use = ar > la ? ordered.slice().reverse() : ordered;
      return use.map(b => b.str).join(' ').replace(/\s+/g, ' ').trim();
    })
    .filter(Boolean);
}

function asUint8(buffer) {
  if (buffer instanceof Uint8Array && buffer.constructor === Uint8Array) return buffer;
  return Uint8Array.from(buffer);
}

async function extractPdfPages(buffer) {
  const data = asUint8(buffer);
  const doc = await getDocument({
    data,
    verbosity: 0,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    disableWorker: true,
    useWorkerFetch: false
  }).promise;
  const pages = [];
  const max = Math.min(doc.numPages || 0, 80);
  for (let n = 1; n <= max; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const lines = linesFromPdfItems(content.items);
    pages.push({ n, lines, text: lines.join('\n') });
  }
  await doc.destroy();
  return pages;
}

function inflateEntry(method, raw) {
  if (method === 0) return raw;
  if (method === 8) return inflateRawSync(raw);
  return null;
}

function zipExtra64(extra, needSize, needOff) {
  let i = 0;
  const out = { size: needSize, off: needOff };
  while (i + 4 <= extra.length) {
    const id = extra.readUInt16LE(i);
    const n = extra.readUInt16LE(i + 2);
    const body = extra.slice(i + 4, i + 4 + n);
    i += 4 + n;
    if (id !== 1) continue;
    let p = 0;
    if (needSize === 0xffffffff && p + 8 <= body.length) {
      out.size = Number(body.readBigUInt64LE(p));
      p += 8;
    }
    if (p + 8 <= body.length) p += 8;
    if (needOff === 0xffffffff && p + 8 <= body.length) out.off = Number(body.readBigUInt64LE(p));
  }
  return out;
}

function unzipFromCentral(buf) {
  const entries = new Map();
  const min = Math.max(0, buf.length - 22 - 65535);
  let eocd = -1;
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) !== 0x06054b50) continue;
    const commentLen = buf.readUInt16LE(i + 20);
    if (i + 22 + commentLen <= buf.length) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return entries;
  let cdOff = buf.readUInt32LE(eocd + 16);
  let cdCount = buf.readUInt16LE(eocd + 10);
  if (cdOff === 0xffffffff || cdCount === 0xffff) {
    const loc = eocd - 20;
    if (loc >= 0 && buf.readUInt32LE(loc) === 0x07064b50) {
      const z64 = Number(buf.readBigUInt64LE(loc + 8));
      if (buf.readUInt32LE(z64) === 0x06064b50) {
        cdCount = Number(buf.readBigUInt64LE(z64 + 32));
        cdOff = Number(buf.readBigUInt64LE(z64 + 48));
      }
    }
  }
  let i = cdOff;
  for (let n = 0; n < cdCount && i + 46 <= buf.length; n++) {
    if (buf.readUInt32LE(i) !== 0x02014b50) break;
    const method = buf.readUInt16LE(i + 10);
    let compSize = buf.readUInt32LE(i + 20);
    const nameLen = buf.readUInt16LE(i + 28);
    const extraLen = buf.readUInt16LE(i + 30);
    const commentLen = buf.readUInt16LE(i + 32);
    let localOff = buf.readUInt32LE(i + 42);
    const name = buf.slice(i + 46, i + 46 + nameLen).toString('utf8');
    const extra = buf.slice(i + 46 + nameLen, i + 46 + nameLen + extraLen);
    if (compSize === 0xffffffff || localOff === 0xffffffff) {
      const z = zipExtra64(extra, compSize, localOff);
      compSize = z.size;
      localOff = z.off;
    }
    if (localOff + 30 <= buf.length && buf.readUInt32LE(localOff) === 0x04034b50) {
      const lName = buf.readUInt16LE(localOff + 26);
      const lExtra = buf.readUInt16LE(localOff + 28);
      const start = localOff + 30 + lName + lExtra;
      const raw = buf.slice(start, start + compSize);
      try {
        const data = inflateEntry(method, raw);
        if (data) entries.set(name, data);
      } catch {
        /* skip a bad entry */
      }
    }
    i += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function unzip(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const central = unzipFromCentral(buf);
  if (central.size) return central;
  const entries = new Map();
  let i = 0;
  while (i < buf.length - 30) {
    const sig = buf.readUInt32LE(i);
    if (sig === 0x02014b50 || sig === 0x06054b50) break;
    if (sig !== 0x04034b50) {
      i += 1;
      continue;
    }
    const method = buf.readUInt16LE(i + 8);
    const flags = buf.readUInt16LE(i + 6);
    const compSize = buf.readUInt32LE(i + 18);
    const nameLen = buf.readUInt16LE(i + 26);
    const extraLen = buf.readUInt16LE(i + 28);
    const name = buf.slice(i + 30, i + 30 + nameLen).toString('utf8');
    const start = i + 30 + nameLen + extraLen;
    if ((flags & 8) && !compSize) break;
    const raw = buf.slice(start, start + compSize);
    try {
      const data = inflateEntry(method, raw);
      if (data) entries.set(name, data);
    } catch {
      /* skip a bad entry */
    }
    i = start + compSize;
  }
  return entries;
}

function extractXlsxLines(buffer) {
  const zip = unzip(buffer);
  const ssXml = zip.get('xl/sharedStrings.xml')?.toString('utf8') || '';
  const strings = [...ssXml.matchAll(/<t[^>]*>([^<]*)<\/t>/g)].map(m => decodeXml(m[1]));
  const sheetNames = [...zip.keys()]
    .filter(k => /^xl\/worksheets\/sheet\d+\.xml$/.test(k))
    .sort((a, b) => Number(/sheet(\d+)/.exec(a)?.[1] || 0) - Number(/sheet(\d+)/.exec(b)?.[1] || 0));
  const pages = [];
  for (const [i, sheetName] of sheetNames.entries()) {
    const sheet = zip.get(sheetName)?.toString('utf8') || '';
    const rows = new Map();
    for (const m of sheet.matchAll(/<c r="([A-Z]+)(\d+)"([^>]*)>(?:<v>([^<]*)<\/v>)?/g)) {
      const col = m[1];
      const row = Number(m[2]);
      const meta = m[3] || '';
      const v = m[4];
      const t = /t="s"/.test(meta);
      const val = t ? (strings[Number(v)] ?? '') : (v ?? '');
      if (!rows.has(row)) rows.set(row, []);
      rows.get(row).push({ col, val: String(val) });
    }
    const lines = [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, cells]) => cells.sort((a, b) => a.col.localeCompare(b.col)).map(c => c.val).filter(Boolean).join('  '))
      .filter(Boolean);
    if (lines.length) pages.push({ n: i + 1, lines, text: lines.join('\n') });
  }
  return pages.length ? pages : [{ n: 1, lines: [], text: '' }];
}

function unpackZip(buffer) {
  const zip = unzip(buffer);
  const files = [];
  for (const [raw, data] of zip) {
    const path = String(raw).replace(/\\/g, '/');
    const base = path.split('/').pop();
    if (!base || path.endsWith('/') || path.includes('__MACOSX') || base.startsWith('.')) continue;
    files.push({ name: base, path, buffer: data });
  }
  return files;
}

function unpackZipDeep(buffer, prefix = '', depth = 0) {
  if (depth > 5) return [];
  const out = [];
  for (const f of unpackZip(buffer)) {
    const path = prefix ? `${prefix.replace(/\/?$/, '/')}${f.path}` : f.path;
    const nested = /\.zip$/i.test(f.name) && !looksLikeWorkbook(f.buffer);
    if (nested) {
      out.push(...unpackZipDeep(f.buffer, path.replace(/\.zip$/i, ''), depth + 1));
    } else {
      out.push({ ...f, path });
    }
  }
  return out;
}

function looksLikeWorkbook(buffer) {
  try {
    return unzip(buffer).has('xl/workbook.xml');
  } catch {
    return false;
  }
}

const SCAN_WARN = 'This PDF is a picture scan. The numbers you see are not selectable text. Upload the MCI iFile Excel (MCI_*.xlsx) or the zip from the same folder. The PDF stays as the signed copy.';
const MAP_WARN = 'The PDF was read, but no relevant statement fields were found (assets, equity, revenue, profit). Upload the MCI iFile Excel (MCI_*.xlsx) from the same pack. The PDF is kept as the signed copy.';
const GARBLE_WARN = 'This PDF has no usable statement text. The letters in the file are not readable as accounts. Upload the MCI iFile Excel (MCI_*.xlsx) from the same folder. The PDF stays as the signed copy.';
const MCI_FAIL_WARN = 'This looks like an MCI iFile workbook, but the statement sheets could not be read. Use the Ministry Excel from the same pack, not a PDF scan.';

const CORE_KEYS = new Set([
  'cash', 'current_assets', 'total_assets', 'current_liab', 'total_liab',
  'equity', 'equity_liab', 'revenue', 'net_profit', 'gross_profit', 'operating_profit'
]);

function pdfScanKind(pages) {
  const text = pages.map(p => p.text || '').join('\n');
  const compact = text.replace(/\s+/g, '');
  if (!pages.length || compact.length < 80) return 'empty';
  return '';
}

function warnForKind(kind) {
  if (kind === 'scan') return SCAN_WARN;
  if (kind === 'garbled') return GARBLE_WARN;
  if (kind === 'unmapped' || kind === 'thin') return MAP_WARN;
  return '';
}

export function classifyExtract(pages = [], lines = []) {
  const text = pages.map(p => p.text || '').join('\n');
  const compact = text.replace(/\s+/g, '');
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const la = (text.match(/[A-Za-z]/g) || []).length;
  const letters = ar + la;
  const core = lines.filter(l => CORE_KEYS.has(l.key) && Math.abs(Number(l.current) || 0) >= 100);
  const mapped = lines.length;
  let kind = 'ok';
  if (!pages.length || compact.length < 80) kind = 'scan';
  else if (letters < 200 || letters / Math.max(compact.length, 1) < 0.22) kind = 'garbled';
  else if (core.length >= 3 || (mapped >= 8 && core.length >= 2)) kind = 'ok';
  else if (!mapped) kind = 'unmapped';
  else kind = 'thin';
  return { kind, usable: kind === 'ok', core: core.length };
}

function decodeXml(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function mapPages(pages) {
  const lines = [];
  let current = 'sfp';
  for (const page of pages) {
    for (const text of stitchLines(page.lines || [])) {
      const header = detectHeader(text);
      if (header) current = header;
      lines.push({ text, page: page.n, statement: current });
    }
  }

  const found = new Map();
  for (const row of lines) {
    const header = detectHeader(row.text);
    if (header) continue;
    if (row.statement === 'notes') continue;
    const nums = statementAmounts(row.text);
    if (!nums.length) continue;
    const label = labelOf(row.text);
    const hit = matchTaxonomy(label, row.statement) || matchTaxonomy(label);
    if (!hit) continue;
    const currentAmt = nums[0];
    const prior = nums.length > 1 ? nums[1] : null;
    const prev = found.get(hit.key);
    const confidence = fold(label) === fold(hit.aliases[0]) ? 0.96 : 0.78;
    if (!prev || confidence > (prev.confidence || 0)) {
      found.set(hit.key, {
        id: `ln-${hit.key}`,
        key: hit.key,
        statement: hit.statement,
        label: hit.en,
        labelAr: hit.ar,
        sourceLabel: label,
        ifrs: hit.ifrs,
        current: currentAmt,
        prior,
        page: row.page,
        confidence
      });
    }
  }
  return [...found.values()];
}

function line(key) {
  return (lines, k = key) => lines.find(l => l.key === k) || null;
}

function v(lines, key, which = 'current') {
  const row = line(key)(lines);
  const n = row?.[which];
  return n == null ? null : Number(n);
}

export function assess(lines, identity = {}, pages = [], sourceSheets = []) {
  const get = (k, w) => v(lines, k, w);
  const has = (k) => lines.some(l => l.statement === k || l.key && TAXONOMY.find(t => t.key === l.key)?.statement === k);
  const byStmt = Object.fromEntries(STATEMENTS.map(s => [s.id, lines.filter(l => l.statement === s.id)]));
  const sheetOf = (id) => (sourceSheets || []).some(s => s.id === id && (s.rows?.length || 0) >= 3);

  const assets = get('total_assets');
  const equity = get('equity');
  const liab = get('total_liab');
  const eqLiab = get('equity_liab');
  const cash = get('cash');
  const cashClose = get('cash_close');
  const ca = get('current_assets');
  const cl = get('current_liab');
  const inv = get('inventory');
  const ni = get('net_profit');
  const rev = get('revenue');
  const gp = get('gross_profit');
  const op = get('operating_profit');

  const assetsTie = assets != null && equity != null && liab != null
    ? Math.abs(assets - (equity + liab)) <= Math.max(1, Math.abs(assets) * 0.01)
    : assets != null && eqLiab != null
      ? Math.abs(assets - eqLiab) <= Math.max(1, Math.abs(assets) * 0.01)
      : null;
  const cashTie = cash != null && cashClose != null
    ? Math.abs(cash - cashClose) <= Math.max(1, Math.abs(cash) * 0.02)
    : null;

  const completeness = {
    sfp: byStmt.sfp.length >= 4 || sheetOf('sfp'),
    pl: byStmt.pl.length >= 3 || sheetOf('pl'),
    cf: byStmt.cf.length >= 2 || sheetOf('cf'),
    eq: byStmt.eq.length >= 1 || sheetOf('eq'),
    notes: pages.some(p => /note|إيضاح/i.test(p.text || '')) || sheetOf('notes')
  };

  const ratio = (id, name, nameAr, value, prior, convention) => (
    { id, name, nameAr, value, prior, convention }
  );
  const r = (a, b) => (a == null || b == null || b === 0 ? null : a / b);
  const priorR = (kA, kB) => r(get(kA, 'prior'), get(kB, 'prior'));

  const ratios = [
    ratio('current', 'Current ratio', 'نسبة التداول', r(ca, cl), priorR('current_assets', 'current_liab'), 'IAS 1 current / current'),
    ratio('quick', 'Quick ratio', 'النسبة السريعة', r(ca != null && inv != null ? ca - inv : null, cl), null, '(CA − inventory) / CL'),
    ratio('de', 'Liabilities / equity', 'الالتزامات إلى حقوق الملكية', r(liab, equity), priorR('total_liab', 'equity'), 'Total liabilities ÷ equity'),
    ratio('roe', 'Return on equity', 'العائد على حقوق الملكية', r(ni, equity), r(get('net_profit', 'prior'), get('equity', 'prior')), 'Profit for the year ÷ equity'),
    ratio('roa', 'Return on assets', 'العائد على الأصول', r(ni, assets), r(get('net_profit', 'prior'), get('total_assets', 'prior')), 'Profit for the year ÷ assets'),
    ratio('gross', 'Gross margin', 'هامش مجمل الربح', r(gp, rev), r(get('gross_profit', 'prior'), get('revenue', 'prior')), 'Gross profit ÷ revenue'),
    ratio('opm', 'Operating margin', 'الهامش التشغيلي', r(op, rev), r(get('operating_profit', 'prior'), get('revenue', 'prior')), 'Operating profit ÷ revenue'),
    ratio('npm', 'Net margin', 'صافي الهامش', r(ni, rev), r(get('net_profit', 'prior'), get('revenue', 'prior')), 'Profit for the year ÷ revenue')
  ];

  const gates = [
    {
      id: 'completeness',
      name: 'IAS 1 completeness',
      nameAr: 'اكتمال معيار 1',
      status: completeness.sfp && completeness.pl ? (completeness.cf ? 'ok' : 'watch') : 'risk',
      detail: `SFP ${completeness.sfp ? 'present' : 'thin'} · P&L ${completeness.pl ? 'present' : 'thin'} · cash flows ${completeness.cf ? 'present' : 'missing'} · equity ${completeness.eq ? 'present' : 'thin'}`,
      detailAr: `المركز ${completeness.sfp ? 'موجود' : 'ضعيف'} · الدخل ${completeness.pl ? 'موجود' : 'ضعيف'} · التدفقات ${completeness.cf ? 'موجودة' : 'ناقصة'}`
    },
    {
      id: 'articulation',
      name: 'Articulation',
      nameAr: 'الاتساق المحاسبي',
      status: assetsTie === false ? 'risk' : assetsTie === true ? 'ok' : 'watch',
      detail: assetsTie == null
        ? 'Could not test assets = equity + liabilities from extracted totals.'
        : assetsTie
          ? 'Assets articulate with equity and liabilities within 1%.'
          : 'Assets do not articulate with equity + liabilities. Steward must check mapping.',
      detailAr: assetsTie == null
        ? 'تعذّر اختبار الأصول = حقوق الملكية + الالتزامات.'
        : assetsTie
          ? 'الأصول تتسق مع حقوق الملكية والالتزامات ضمن 1%.'
          : 'الأصول لا تتسق مع حقوق الملكية والالتزامات. يلزم أمين البيانات.'
    },
    {
      id: 'cash',
      name: 'Cash tie-out',
      nameAr: 'ربط النقد',
      status: cashTie === false ? 'watch' : cashTie === true ? 'ok' : 'watch',
      detail: cashTie == null
        ? 'Cash on the position statement did not meet a closing cash line.'
        : cashTie
          ? 'Closing cash ties to the position statement.'
          : 'Closing cash and the cash line differ. Check units or scope.',
      detailAr: cashTie == null
        ? 'لم يُربط نقد قائمة المركز بنهاية التدفقات.'
        : cashTie
          ? 'نقد الإقفال يطابق قائمة المركز.'
          : 'نقد الإقفال يختلف عن بند النقد. راجع الوحدة أو النطاق.'
    },
    {
      id: 'identity',
      name: 'Identity and units',
      nameAr: 'الهوية والوحدة',
      status: identity.periodLabel && identity.currency ? 'ok' : 'watch',
      detail: `${identity.entity || 'Entity pending'} · ${identity.periodLabel || 'period pending'} · ${identity.unit || 'unit pending'} · ${identity.framework || 'IFRS'}`,
      detailAr: `${identity.entity || 'الكيان معلّق'} · ${identity.periodLabel || 'الفترة معلّقة'} · ${identity.unit || 'الوحدة معلّقة'}`
    },
    {
      id: 'language',
      name: 'Language',
      nameAr: 'اللغة',
      status: 'ok',
      detail: identity.language === 'ar'
        ? 'Arabic script dominates. Labels mapped through the SOCPA / IFRS Arabic lexicon.'
        : identity.language === 'bilingual'
          ? 'Bilingual filing. English and Arabic aliases were both applied.'
          : 'Latin script dominates. Arabic aliases remain available for chat.',
      detailAr: identity.language === 'ar'
        ? 'النص العربي غالب. التسميات وُصفت عبر معجم الهيئة / IFRS.'
        : identity.language === 'bilingual'
          ? 'قائمة ثنائية اللغة. طُبّقت الأسماء العربية والإنجليزية.'
          : 'النص اللاتيني غالب. الأسماء العربية متاحة في المحادثة.'
    },
    {
      id: 'signoff',
      name: 'Human sign-off',
      nameAr: 'توقيع بشري',
      status: 'watch',
      detail: 'A machine extracted. A person still signs. This assessment does not write the certified Pulse.',
      detailAr: 'الآلة استخرجت. الشخص يوقّع. هذا التقييم لا يكتب النبض المعتمد.'
    }
  ];

  const held = gates.filter(g => g.status !== 'ok').length;
  return {
    gates,
    ratios,
    completeness,
    articulation: { assetsEq: assetsTie, cashTie },
    held,
    status: held ? 'in_review' : 'assessed'
  };
}

function emptyStatements() {
  return Object.fromEntries(STATEMENTS.map(s => [s.id, { ...s, lines: [] }]));
}

export function assembleFiling({ id, file, pages, lines, identity, synthetic = false, source = 'upload', sourceSheets = null, pack = '', warnings = null }) {
  const statements = emptyStatements();
  for (const row of lines) {
    if (!statements[row.statement]) continue;
    statements[row.statement].lines.push(row);
  }
  const assessment = assess(lines, identity, pages, sourceSheets || []);
  const quality = classifyExtract(pages, lines);
  const text = pages.map(p => p.text).join('\n\n');
  const ar = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const defaultWarn = quality.usable ? [] : [warnForKind(quality.kind) || MAP_WARN];
  return {
    id,
    synthetic,
    source,
    status: quality.usable ? assessment.status : (pages.length ? 'watch' : 'failed'),
    file: {
      name: file?.name || 'statement.pdf',
      mime: file?.mime || 'application/pdf',
      pages: pages.length,
      bytes: file?.bytes || 0
    },
    identity,
    statements,
    lines,
    assessment,
    sourceSheets: sourceSheets || null,
    extract: {
      model: pack === 'mci-ifile'
        ? 'MCI iFile · IFRS EN/AR taxonomy'
        : 'pdfjs-dist 4 · IFRS EN/AR lexicon',
      pack: pack || null,
      pages: pages.length,
      language: identity.language,
      arabicChars: ar,
      mapped: lines.length,
      kind: quality.kind,
      usable: quality.usable,
      confidence: lines.length
        ? lines.reduce((s, l) => s + (l.confidence || 0), 0) / lines.length
        : 0,
      warnings: warnings || defaultWarn,
      preview: text.slice(0, 1200)
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function mimeOf(name, fallback = 'application/octet-stream') {
  const n = String(name || '').toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.xlsx')) return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (n.endsWith('.xls')) return 'application/vnd.ms-excel';
  if (n.endsWith('.zip')) return 'application/zip';
  if (n.endsWith('.csv')) return 'text/csv';
  if (n.endsWith('.png')) return 'image/png';
  if (n.endsWith('.jpg') || n.endsWith('.jpeg')) return 'image/jpeg';
  return fallback;
}

function pickPackParts(files) {
  const xlsx = files.filter(f => /\.xlsx?$/i.test(f.name) || looksLikeWorkbook(f.buffer));
  const pdfs = files.filter(f => /\.pdf$/i.test(f.name));
  const mci = xlsx.find(f => isMciWorkbook(f.buffer)) || xlsx.find(f => /^mci_/i.test(f.name)) || xlsx[0] || null;
  return { workbook: mci, pdf: pdfs[0] || null };
}

async function extractWorkbook(buffer, name, mime) {
  if (isMciWorkbook(buffer)) {
    const mci = parseMciFiling(buffer);
    if (mci) {
      return assembleFiling({
        id: newId('fs'),
        file: { name, mime: mime || mimeOf(name), bytes: buffer.length },
        pages: mci.pages,
        lines: mci.lines,
        identity: mci.identity,
        source: 'upload',
        sourceSheets: mci.sourceSheets,
        pack: mci.pack
      });
    }
    const filing = assembleFiling({
      id: newId('fs'),
      file: { name, mime: mime || mimeOf(name), bytes: buffer.length },
      pages: [],
      lines: [],
      identity: detectIdentity([], name),
      source: 'upload',
      pack: 'mci-ifile',
      warnings: [MCI_FAIL_WARN]
    });
    filing.identity.framework = 'IFRS as endorsed in KSA · MCI iFile';
    return filing;
  }
  const pages = extractXlsxLines(buffer);
  const allLines = pages.flatMap(p => p.lines);
  return assembleFiling({
    id: newId('fs'),
    file: { name, mime: mime || mimeOf(name), bytes: buffer.length },
    pages,
    lines: mapPages(pages),
    identity: detectIdentity(allLines, name),
    source: 'upload'
  });
}

async function extractPdfFiling(buffer, name, mime) {
  let pages = [];
  try {
    pages = await extractPdfPages(buffer);
  } catch {
    const filing = assembleFiling({
      id: newId('fs'),
      file: { name, mime: mime || 'application/pdf', bytes: buffer.length },
      pages: [],
      lines: [],
      identity: detectIdentity([], name),
      source: 'upload',
      warnings: [SCAN_WARN]
    });
    return filing;
  }
  const allLines = pages.flatMap(p => p.lines);
  const identity = detectIdentity(allLines, name);
  const mapped = pdfScanKind(pages) ? [] : mapPages(pages);
  const quality = classifyExtract(pages, mapped);
  const lines = quality.usable ? mapped : [];
  return assembleFiling({
    id: newId('fs'),
    file: { name, mime: mime || 'application/pdf', bytes: buffer.length },
    pages,
    lines,
    identity,
    source: 'upload',
    warnings: quality.usable ? null : [warnForKind(quality.kind)]
  });
}

async function extractFromParts(files, fallbackName, fallbackMime, fallbackBuffer) {
  const { workbook, pdf } = pickPackParts(files);
  if (workbook) {
    const filing = await extractWorkbook(workbook.buffer, workbook.name, mimeOf(workbook.name));
    filing._displayBuffer = pdf?.buffer || workbook.buffer;
    if (pdf) {
      filing.file = {
        ...filing.file,
        name: pdf.name,
        mime: 'application/pdf',
        bytes: pdf.buffer.length
      };
    }
    return filing;
  }
  if (pdf) return extractPdfFiling(pdf.buffer, pdf.name, 'application/pdf');
  return extractPdfFiling(fallbackBuffer, fallbackName, fallbackMime);
}

export async function extractBuffer(buffer, { name = 'statement.pdf', mime = 'application/pdf', companions = [] } = {}) {
  const lower = String(name).toLowerCase();
  const type = String(mime || '').toLowerCase();
  const extra = (companions || []).map(c => ({
    name: c.name || 'file',
    buffer: c.buffer,
    mime: c.mime || mimeOf(c.name)
  }));

  if (extra.length) {
    return extractFromParts(
      [{ name, buffer, mime: type || mimeOf(name) }, ...extra],
      name,
      mime,
      buffer
    );
  }

  if (type.startsWith('image/') || /\.(png|jpe?g|webp|gif|tif)$/i.test(lower)) {
    const identity = detectIdentity([], name);
    const filing = assembleFiling({
      id: newId('img'),
      file: { name, mime, bytes: buffer.length },
      pages: [],
      lines: [],
      identity,
      source: 'upload'
    });
    filing.extract.warnings = ['This is a scan. The PDF model reads a text layer. Export the statement as a text PDF or Excel, or wait for OCR on an in-Kingdom host.'];
    return filing;
  }

  if (type.includes('csv') || /\.csv$/.test(lower)) {
    const text = Buffer.from(buffer).toString('utf8');
    const lines = text.split(/\r?\n/).map(s => s.replace(/,/g, '  ')).filter(Boolean);
    const pages = [{ n: 1, lines, text: lines.join('\n') }];
    return assembleFiling({
      id: newId('fs'),
      file: { name, mime: mime || 'text/csv', bytes: buffer.length },
      pages,
      lines: mapPages(pages),
      identity: detectIdentity(lines, name),
      source: 'upload'
    });
  }

  const workbook = looksLikeWorkbook(buffer) || type.includes('spreadsheet') || type.includes('excel') || /\.xlsx?$/.test(lower);
  if (workbook) return extractWorkbook(buffer, name, mime);

  const zipName = /\.zip$/.test(lower) || (type.includes('zip') && !type.includes('sheet'));
  if (zipName) {
    const inner = unpackZipDeep(buffer);
    const books = inner.filter(f => /\.xlsx?$/i.test(f.name) || looksLikeWorkbook(f.buffer));
    const pdfs = inner.filter(f => /\.pdf$/i.test(f.name));
    if (books.length > 1) {
      const filings = [];
      for (const book of books) {
        const dir = String(book.path || '').replace(/[^/]+$/, '');
        const nums = String(book.name).match(/\d{7,}/g) || [];
        const pdf = pdfs.find(p => String(p.path || '').startsWith(dir) && p !== book)
          || pdfs.find(p => nums.some(n => `${p.path || ''} ${p.name}`.includes(n)))
          || null;
        const one = await extractFromParts([book, pdf].filter(Boolean), book.name, mimeOf(book.name), book.buffer);
        if (!one._displayBuffer) one._displayBuffer = pdf?.buffer || book.buffer;
        filings.push(one);
      }
      if (filings.length) {
        filings[0]._queue = filings.slice(1);
        return filings[0];
      }
    }
    if (inner.some(f => /\.xlsx?$/i.test(f.name) || /\.pdf$/i.test(f.name) || looksLikeWorkbook(f.buffer))) {
      return extractFromParts(inner, name, mime, buffer);
    }
  }

  return extractPdfFiling(buffer, name, mime);
}

export function newId(prefix = 'fs') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function escPdf(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

/** Minimal multi-page IFRS sample used to exercise the extractor. Synthetic figures. */
export function buildSampleIfrsPdf() {
  const pages = [
    [
      [50, 760, 14, 'Horizon KSA Distribution'],
      [50, 742, 10, 'شركة أفق للتوزيع'],
      [50, 724, 10, 'Statement of financial position · قائمة المركز المالي'],
      [50, 708, 9, 'As at 31 December 2025 · IFRS as endorsed in KSA · SAR 000'],
      [360, 688, 9, '2025'],
      [440, 688, 9, '2024'],
      [50, 660, 10, 'Cash and cash equivalents'], [360, 660, 10, '12,400'], [440, 660, 10, '9,100'],
      [50, 642, 10, 'Trade receivables'], [360, 642, 10, '28,600'], [440, 642, 10, '24,200'],
      [50, 624, 10, 'Inventories'], [360, 624, 10, '31,200'], [440, 624, 10, '27,800'],
      [50, 606, 10, 'Total current assets'], [360, 606, 10, '72,200'], [440, 606, 10, '61,100'],
      [50, 580, 10, 'Property, plant and equipment'], [360, 580, 10, '54,800'], [440, 580, 10, '51,200'],
      [50, 562, 10, 'Intangible assets'], [360, 562, 10, '6,600'], [440, 562, 10, '5,600'],
      [50, 544, 10, 'Total non-current assets'], [360, 544, 10, '61,400'], [440, 544, 10, '56,800'],
      [50, 518, 10, 'Total assets'], [360, 518, 10, '133,600'], [440, 518, 10, '117,900'],
      [50, 486, 10, 'Trade payables'], [360, 486, 10, '19,400'], [440, 486, 10, '17,200'],
      [50, 468, 10, 'Short-term borrowings'], [360, 468, 10, '8,600'], [440, 468, 10, '9,400'],
      [50, 450, 10, 'Total current liabilities'], [360, 450, 10, '32,800'], [440, 450, 10, '30,100'],
      [50, 424, 10, 'Long-term borrowings'], [360, 424, 10, '22,400'], [440, 424, 10, '24,800'],
      [50, 406, 10, 'Total non-current liabilities'], [360, 406, 10, '28,200'], [440, 406, 10, '30,600'],
      [50, 380, 10, 'Total liabilities'], [360, 380, 10, '61,000'], [440, 380, 10, '60,700'],
      [50, 354, 10, 'Share capital'], [360, 354, 10, '20,000'], [440, 354, 10, '20,000'],
      [50, 336, 10, 'Retained earnings'], [360, 336, 10, '52,600'], [440, 336, 10, '37,200'],
      [50, 318, 10, 'Total equity'], [360, 318, 10, '72,600'], [440, 318, 10, '57,200'],
      [50, 292, 10, 'Total equity and liabilities'], [360, 292, 10, '133,600'], [440, 292, 10, '117,900'],
      [50, 250, 8, 'Synthetic populated filing for the Pulse OS prototype. Not a MISA or investee record.']
    ],
    [
      [50, 760, 14, 'Horizon KSA Distribution'],
      [50, 742, 10, 'Statement of profit or loss · قائمة الربح أو الخسارة'],
      [50, 724, 9, 'Year ended 31 December 2025 · SAR 000'],
      [360, 700, 9, '2025'],
      [440, 700, 9, '2024'],
      [50, 672, 10, 'Revenue'], [360, 672, 10, '186,400'], [440, 672, 10, '162,100'],
      [50, 654, 10, 'Cost of sales'], [360, 654, 10, '(141,200)'], [440, 654, 10, '(124,800)'],
      [50, 636, 10, 'Gross profit'], [360, 636, 10, '45,200'], [440, 636, 10, '37,300'],
      [50, 610, 10, 'Operating expenses'], [360, 610, 10, '(18,600)'], [440, 610, 10, '(16,400)'],
      [50, 592, 10, 'Operating profit'], [360, 592, 10, '26,600'], [440, 592, 10, '20,900'],
      [50, 566, 10, 'Finance costs'], [360, 566, 10, '(4,200)'], [440, 566, 10, '(3,800)'],
      [50, 548, 10, 'Profit before zakat and tax'], [360, 548, 10, '22,400'], [440, 548, 10, '17,100'],
      [50, 530, 10, 'Zakat and income tax'], [360, 530, 10, '(2,800)'], [440, 530, 10, '(2,140)'],
      [50, 504, 10, 'Profit for the year'], [360, 504, 10, '19,600'], [440, 504, 10, '14,960'],
      [50, 460, 8, 'Synthetic · populated. Does not write the certified Pulse.']
    ],
    [
      [50, 760, 14, 'Horizon KSA Distribution'],
      [50, 742, 10, 'Statement of cash flows · قائمة التدفقات النقدية'],
      [50, 724, 9, 'Year ended 31 December 2025 · SAR 000'],
      [360, 700, 9, '2025'],
      [440, 700, 9, '2024'],
      [50, 672, 10, 'Net cash from operating activities'], [360, 672, 10, '24,100'], [440, 672, 10, '18,400'],
      [50, 654, 10, 'Net cash used in investing activities'], [360, 654, 10, '(8,200)'], [440, 654, 10, '(6,100)'],
      [50, 636, 10, 'Net cash used in financing activities'], [360, 636, 10, '(12,600)'], [440, 636, 10, '(9,800)'],
      [50, 610, 10, 'Net increase in cash'], [360, 610, 10, '3,300'], [440, 610, 10, '2,500'],
      [50, 584, 10, 'Cash at beginning of period'], [360, 584, 10, '9,100'], [440, 584, 10, '6,600'],
      [50, 566, 10, 'Cash at end of period'], [360, 566, 10, '12,400'], [440, 566, 10, '9,100'],
      [50, 520, 10, 'Notes to the financial statements'],
      [50, 500, 9, '1  Framework  IFRS as endorsed in the Kingdom of Saudi Arabia.'],
      [50, 484, 9, '2  Currency  Saudi riyal, presented in thousands.'],
      [50, 468, 9, '3  Related party  Parent Horizon ME Holdings. Evidence path for FDI debt.'],
      [50, 430, 8, 'Synthetic populated filing. Not confidential ministry or investee data.']
    ]
  ];

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  const contentIds = [];
  for (const items of pages) {
    const stream = items.map(([x, y, size, text]) =>
      `BT /F1 ${size} Tf ${x} ${y} Td (${escPdf(text)}) Tj ET`
    ).join('\n');
    contentIds.push(add(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`));
  }
  const kids = [];
  for (let i = 0; i < pages.length; i++) {
    const id = add(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>`);
    pageIds.push(id);
    kids.push(`${id} 0 R`);
  }
  const pagesId = add(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`);
  for (let i = 0; i < pageIds.length; i++) {
    objects[pageIds[i] - 1] = objects[pageIds[i] - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  }
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let out = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(out));
    out += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objects.length + 1}\n`;
  out += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out);
}

export async function extractSample() {
  const buffer = buildSampleIfrsPdf();
  const filing = await extractBuffer(buffer, {
    name: 'Horizon-KSA-FY2025-IFRS.pdf',
    mime: 'application/pdf'
  });
  filing.synthetic = true;
  filing.source = 'sample';
  filing.id = 'fsa-horizon-fy2025';
  filing.identity.entity = 'Horizon KSA Distribution';
  filing.identity.entityAr = 'شركة أفق للتوزيع';
  filing.identity.auditor = 'Synthetic · populated';
  filing.identity.framework = 'IFRS as endorsed in KSA';
  filing.identity.periodLabel = 'FY2025';
  filing.identity.periodEnd = '2025-12-31';
  filing.identity.comparative = '2024';
  return filing;
}
