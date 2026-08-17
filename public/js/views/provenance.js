/**
 * Provenance - clear real vs modelled notes.
 */
import { REAL, MODELLED } from '../fixtures/provenance.js';
import { bindNumberDefs } from '../lib/kpiMark.js';
import { t } from '../i18n.js';

function rows(items, kind) {
  return items.map(([t, d], i) => `
    <article class="prov-row" data-kind="${kind}">
      <div class="prov-idx">${String(i + 1).padStart(2, '0')}</div>
      <div class="prov-body">
        <div class="prov-title">${t}</div>
        <div class="prov-desc">${d}</div>
      </div>
      <div class="prov-tag">${kind === 'REAL' ? 'Real' : 'Modelled'}</div>
    </article>`).join('');
}

export function renderProvenance(root) {
  root.innerHTML = `
    <div class="stage"><div class="panel" style="padding-top:20px">
      <h1>${t().tabs.about}</h1>
      <p class="lede">What comes from source files versus what this prototype models so the live path can be exercised.</p>

      <section class="prov-board" aria-labelledby="prov-real">
        <header class="prov-head">
          <div>
            <div class="sys-kicker" id="prov-real">Real</div>
            <h2 class="prov-h2">Loaded from source</h2>
          </div>
          <span class="prov-count" data-kpi-def="pack" data-kpi-name="Loaded from source" data-kpi-body="Count of rows on this page that come from a source file, not a modelled stand-in.">${REAL.length}</span>
        </header>
        <div class="prov-list">${rows(REAL, 'REAL')}</div>
      </section>

      <section class="prov-board" aria-labelledby="prov-mod">
        <header class="prov-head">
          <div>
            <div class="sys-kicker" id="prov-mod">Modelled</div>
            <h2 class="prov-h2">Indicative for the prototype</h2>
          </div>
          <span class="prov-count" data-kpi-def="pack" data-kpi-name="Modelled for the prototype" data-kpi-body="Count of rows modelled so the live path can be exercised. They are not source-file prints.">${MODELLED.length}</span>
        </header>
        <div class="prov-list">${rows(MODELLED, 'MODEL')}</div>
      </section>
    </div></div>`;
  bindNumberDefs(root);
}
