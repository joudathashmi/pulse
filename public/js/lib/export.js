/**
 * Export helpers - PNG (from SVG/node), CSV, PDF (print), page report.
 * No external libs.
 */

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename, text, mime = 'text/plain;charset=utf-8') {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function exportCsv(filename, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map(r => r.map(esc).join(',')).join('\n');
  downloadText(filename, csv, 'text/csv;charset=utf-8');
}

/** Rasterise an SVG element (or wrapper containing svg) to PNG. */
export async function exportNodePng(node, filename = 'chart.png', scale = 2) {
  const svg = node?.tagName?.toLowerCase() === 'svg' ? node : node?.querySelector?.('svg');
  if (!svg) {
    // fallback: print instruction
    window.alert('No chart SVG found to export as PNG.');
    return;
  }
  const clone = svg.cloneNode(true);
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const rect = svg.getBoundingClientRect();
  const w = Math.max(svg.viewBox?.baseVal?.width || rect.width || 900, 320);
  const h = Math.max(svg.viewBox?.baseVal?.height || rect.height || 330, 200);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  const xml = new XMLSerializer().serializeToString(clone);
  const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
  const img = new Image();
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = svgUrl;
  });
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--surf-raised').trim() || '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, w, h);
  await new Promise(resolve => {
    canvas.toBlob(blob => {
      if (blob) downloadBlob(filename, blob);
      resolve();
    }, 'image/png');
  });
}

export function exportPdfPrint(title = 'Investment Pulse Operating System') {
  document.title = title;
  window.print();
}

/** Build a markdown-ish text report from brief + series for download / print. */
export function buildPackReport(data = {}) {
  const brief = data.brief || {};
  const fdi = brief.headlines?.fdi || {};
  const gfcf = brief.headlines?.gfcf || {};
  const signals = brief.signals || [];
  const lines = [
    'INVESTMENT PULSE · CERTIFIED PACK REPORT',
    `Generated: ${new Date().toISOString()}`,
    `Source pack: ${brief.source?.titleEn || brief.source?.title || 'Organisational performance'} · Meeting ${brief.source?.meeting ?? '-'} · ${brief.source?.asOfLabel || ''}`,
    '',
    '- HEADLINES -',
    `FDI net: ${fdi.pulseValue} SAR bn · status ${fdi.status} · target ${fdi.yearTarget} · source ${fdi.source}`,
    `GFCF: ${gfcf.pulseValue} SAR bn · status ${gfcf.status} · target ${gfcf.yearTarget} · source ${gfcf.source}`,
    '',
    '- LEADING SIGNALS -',
    ...signals.map(s => `${s.id}: ${s.name} = ${s.value} (${s.delta || ''}) · ${s.status} · ${s.source} · ${s.period || ''}`),
    '',
    'Every headline is traceable: definition, source and calculation stamp are on the KPI signature mark in the live view.',
    'End of report.'
  ];
  return lines.join('\n');
}

export function exportReportTxt(data) {
  downloadText(`investment-pulse-report-${Date.now()}.txt`, buildPackReport(data));
}

export function exportBriefCsv(data) {
  const brief = data.brief || {};
  const rows = [['id', 'name', 'value', 'status', 'source', 'period', 'metric']];
  for (const [id, h] of Object.entries(brief.headlines || {})) {
    rows.push([id, h.name, h.pulseValue, h.status, h.source, h.pulseLabel || 'Q1', id]);
  }
  for (const s of brief.signals || []) {
    rows.push([s.id, s.name, s.value, s.status, s.source, s.period || '', s.metric || '']);
  }
  exportCsv(`investment-pulse-data-${Date.now()}.csv`, rows);
}

export function exportRawJson(data) {
  const payload = {
    exportedAt: new Date().toISOString(),
    brief: data?.brief || null,
    series: data?.series || null,
    nowcast: data?.nowcast || null
  };
  downloadText(`investment-pulse-raw-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

/** Toolbar HTML fragment for chart exports. */
export function exportToolbarHtml(id = 'chart') {
  return `<div class="export-bar" data-export-for="${id}">
    <span class="export-lab">Export</span>
    <button type="button" class="export-btn" data-ex="png">PNG</button>
    <button type="button" class="export-btn" data-ex="csv">CSV</button>
    <button type="button" class="export-btn" data-ex="pdf">PDF</button>
  </div>`;
}
