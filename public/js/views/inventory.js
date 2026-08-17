import { $, intoViewIfNeeded } from '../lib/dom.js';
import { bindNumberDefs } from '../lib/kpiMark.js';
import { t } from '../i18n.js';

const uniq = a => [...new Set(a)].filter(Boolean).sort();

export function renderInventory(root, inventory) {
  const gaps = {};
  for (const r of inventory) gaps[r.w] = (gaps[r.w] || 0) + 1;
  const avail = inventory.filter(r => /^Available/i.test(r.a || '')).length;
  const cards = [
    ['Metrics', inventory.length, 'inv-metrics'],
    ['Available', avail, 'inv-available'],
    ['No owner', gaps['No clear owner'] || 0, 'inv-owner'],
    ['Sharing', gaps['Sharing mechanism challenge'] || 0, 'inv-sharing']
  ];
  root.innerHTML = `
    <div class="stage"><div class="panel" style="padding-top:20px">
      <h1>${t().tabs.inv}</h1>
      <p class="lede">${inventory.length} ministry metrics from the indicator workbook. The Pulse board shows the certified pack only - 2 headlines and 20 leading signals. This catalogue is the rest: series that are available, held for an owner, or waiting on a share.</p>
      <div class="grid four" style="margin:16px 0">
        ${cards.map(c => `<div class="card"><div class="k">${c[0]}</div>
          <div class="stat" data-kpi-def="${c[2]}">${c[1]}</div></div>`).join('')}
      </div>
      <div class="ctl">
        <input data-q type="search" placeholder="Search…" aria-label="Search">
        <select data-fc aria-label="Category"></select>
        <select data-fw aria-label="Gap"></select>
        <select data-fa aria-label="Availability"></select>
        <span data-count class="meta"></span>
      </div>
      <div class="wh-table-wrap card scroll"><table class="wh-table"><thead><tr>
        <th>Metric</th><th>Category</th><th>Owner</th><th>Avail.</th><th>Freq.</th><th>Gap</th>
      </tr></thead><tbody data-rows></tbody></table></div>
      <div data-inv-detail></div>
    </div></div>`;

  const q = $('[data-q]', root), fc = $('[data-fc]', root), fw = $('[data-fw]', root), fa = $('[data-fa]', root);
  fc.innerHTML = '<option value="">All categories</option>' + uniq(inventory.map(r => r.c)).map(v => `<option>${v}</option>`).join('');
  fw.innerHTML = '<option value="">All gaps</option>' + uniq(inventory.map(r => r.w)).map(v => `<option>${v}</option>`).join('');
  fa.innerHTML = '<option value="">All availability</option>' + uniq(inventory.map(r => r.a)).map(v => `<option>${v}</option>`).join('');

  const detail = $('[data-inv-detail]', root);
  const draw = () => {
    const term = q.value.toLowerCase();
    const rows = inventory.filter(r =>
      (!fc.value || r.c === fc.value) && (!fw.value || r.w === fw.value) && (!fa.value || r.a === fa.value) &&
      (!term || `${r.m} ${r.o} ${r.c} ${r.s}`.toLowerCase().includes(term)));
    $('[data-count]', root).textContent = `${rows.length} of ${inventory.length}`;
    $('[data-rows]', root).innerHTML = rows.slice(0, 400).map((r, i) => `<tr tabindex="0" data-i="${i}">
      <td>${r.m || '-'}<div class="sub2">${r.s || ''}</div></td>
      <td>${r.c}</td><td>${r.o || '-'}</td>
      <td>${r.a || '-'}</td>
      <td>${r.f || '-'}</td>
      <td>${r.w}</td></tr>`).join('');
    for (const tr of root.querySelectorAll('[data-rows] tr')) {
      const show = () => {
        const r = rows[Number(tr.dataset.i)];
        if (!r) return;
        detail.innerHTML = `<article class="wh-card" style="margin-top:12px">
          <div class="wh-k">Lineage · inventory record</div>
          <h2 style="margin:6px 0 8px">${r.m || '-'}</h2>
          <p class="wh-est">Category <b>${r.c}</b> · use case <b>${r.s || '-'}</b></p>
          <p class="wh-est">Owner <b>${r.o || '-'}</b> · availability <b>${r.a || '-'}</b> · frequency <b>${r.f || '-'}</b></p>
          <p class="wh-est">Gap <b>${r.w || '-'}</b> · sharing <b>${r.sh || '-'}</b></p>
          <p class="wh-est">${r.q || 'No quality note on this row.'}</p>
          <p class="wh-est">This row is the ministry catalogue. It does not enter Pulse until a steward certifies a series against the six DQAF gates.</p>
        </article>`;
        intoViewIfNeeded(detail);
      };
      tr.addEventListener('click', show);
      tr.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(); }
      });
    }
  };
  for (const s of [fc, fw, fa]) s.onchange = draw;
  q.oninput = draw;
  draw();
  bindNumberDefs(root);
}
