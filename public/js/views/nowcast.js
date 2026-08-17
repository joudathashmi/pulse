import { SERIES } from '../config.js';
import { $ } from '../lib/dom.js';
import { t } from '../i18n.js';
import { renderNowcast } from '../charts/nowcast.js';
import { renderBacktest } from '../charts/bars.js';
import { exportToolbarHtml, exportNodePng, exportCsv, exportPdfPrint } from '../lib/export.js';
import { kpiMarkHtml, bindKpiHelp } from '../lib/kpiMark.js';
import { openAskOwnerDialog } from './alerts.js';
import { ownerForMetric } from '../lib/queries.js';

function wireExport(bar, chartHost, rows, title) {
  bar?.querySelectorAll('[data-ex]').forEach(btn => {
    btn.onclick = async () => {
      const kind = btn.dataset.ex;
      if (kind === 'png') await exportNodePng(chartHost, `${title.replace(/\s+/g, '-').toLowerCase()}.png`);
      else if (kind === 'csv') exportCsv(`${title.replace(/\s+/g, '-').toLowerCase()}.csv`, rows);
      else if (kind === 'pdf') exportPdfPrint(title);
    };
  });
}

export function renderNowcastView(root, data) {
  const { nowcast, backtest, brief } = data;
  const s = t();
  root.innerHTML = `
    <div class="stage"><div class="panel" style="padding-top:20px">
      <h1 class="wh-ind">${s.nowcastTitle}${kpiMarkHtml('fdi')}</h1>
      <p class="lede">${s.nowcastSub}</p>
      <p class="synth-banner" role="note"><span class="synth-badge">${s.synthBadge || 'Synthetic · populated'}</span> ${s.synthNote || 'These estimate values are populated synthetic figures for a publicly hosted prototype. They are not MISA calculations and are not confidential internal estimates.'}</p>
      <div class="card" style="margin-top:16px">
        <div class="card-tools">
          <div class="legend">
            <span><i style="border-top:2px dashed ${SERIES.estimate}"></i>${s.estimate}</span>
            <span><i style="border-top:2px solid ${SERIES.official}"></i>${s.official}</span>
            <span><i class="swatch"></i>${s.band}</span>
          </div>
          ${exportToolbarHtml('nowcast')}
        </div>
        <div data-chart></div>
        <details class="tv"><summary>${s.viewTable}</summary><div class="wh-table-wrap" data-table></div></details>
      </div>
      <div class="card" style="margin-top:12px">
        <div class="card-tools">
          <div class="k">${s.backtest}</div>
          ${exportToolbarHtml('backtest')}
        </div>
        <div data-bt style="margin-top:10px"></div>
        <details class="tv"><summary>${s.viewTable}</summary><div class="wh-table-wrap" data-bttable></div></details>
      </div>
    </div></div>`;
  const chartHost = $('[data-chart]', root);
  const btHost = $('[data-bt]', root);
  renderNowcast(chartHost, $('[data-table]', root), nowcast);
  renderBacktest(btHost, $('[data-bttable]', root), backtest);

  const nowRows = [['week', 'estimate', 'lower', 'upper']].concat(
    (nowcast?.path || []).map(p => [p.w, p.est, p.lo, p.hi])
  );
  nowRows.push(['official', nowcast?.official, '', '']);
  wireExport(root.querySelector('[data-export-for="nowcast"]'), chartHost, nowRows, 'FDI nowcast');

  const btRows = [['period', 'estimate', 'actual', 'error_pct']].concat(
    (backtest || []).map(r => [r.p || r.q || r.period || r.label, r.est ?? r.estimate, r.act ?? r.actual, r.err ?? r.error])
  );
  wireExport(root.querySelector('[data-export-for="backtest"]'), btHost, btRows, 'FDI backtest');

  bindKpiHelp(root, {
    brief,
    onAskDefinition: (meta, id) => {
      const info = ownerForMetric(id, brief);
      openAskOwnerDialog({
        metric: id,
        value: '',
        owner: info.owner || meta.owner,
        ownerContact: info.contact,
        title: meta.name,
        question: `Please confirm the official definition of “${meta.name}”.\n\n${meta.definition}\n\nSource: ${meta.source}\nCalculated: ${meta.calculatedLabel}`
      });
    }
  });
}
