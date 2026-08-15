/**
 * One work list from the pack, gates and alerts.
 * Quarantine = held or not issued. Do not invent extra items.
 */
import { ALERTS } from '../fixtures/alerts.js';
import { EXCEPTIONS } from '../fixtures/quality.js';
import { isOpenCase, listCases } from './control.js';

export function heldPackRows(data = {}) {
  const pack = data.indicators2026;
  const quarantine = [];
  const actions = [];

  for (const row of pack?.fdi?.rows || []) {
    if (row.issued || !/^q\d/.test(row.id)) continue;
    quarantine.push({
      id: `q-fdi-${row.id}`,
      title: `FDI ${row.period} actual`,
      detail: 'GASTAT has not issued the actual. Forecast stays on the sheet. Pulse is not overwritten.',
      owner: 'Economic Affairs',
      source: pack.source?.file || 'Indicators pack',
      gate: 'Completeness · vintage',
      status: 'held',
      path: ['fdi', 'pack', row.id]
    });
  }
  for (const row of pack?.gfcf?.rows || []) {
    if (row.issued || !/^q\d/.test(row.id)) continue;
    quarantine.push({
      id: `q-gfcf-${row.id}`,
      title: `GFCF ${row.period} actual`,
      detail: 'GASTAT has not issued the actual. Economic Affairs forecast is on the sheet only.',
      owner: 'Economic Affairs',
      source: pack.source?.file || 'Indicators pack',
      gate: 'Completeness · vintage',
      status: 'held',
      path: ['gfcf', 'pack', row.id]
    });
  }
  for (const sig of pack?.signals || []) {
    if (sig.value != null) continue;
    quarantine.push({
      id: `q-sig-${sig.id}`,
      title: sig.name,
      detail: sig.note || 'Empty in the Indicators pack. No value can be certified.',
      owner: sig.owner,
      source: `${sig.sheet} · row ${sig.row}`,
      gate: 'Completeness',
      status: 'held',
      path: [sig.id]
    });
  }

  for (const [title, reason, state, owner, resolution] of EXCEPTIONS) {
    const held = /held|cannot|awaiting|scheduled/i.test(`${state} ${resolution}`);
    if (held) {
      quarantine.push({
        id: `q-ex-${title}`,
        title,
        detail: `${reason} ${state}.`,
        owner,
        source: 'Quality gates · exception queue',
        gate: 'Human sign-off',
        status: 'held',
        go: 'qual'
      });
    }
    if (/awaiting|scheduled|confirm/i.test(resolution)) {
      actions.push({
        id: `act-ex-${title}`,
        title: resolution,
        on: title,
        owner,
        deadline: '—',
        status: 'open',
        kind: 'quality',
        go: 'qual'
      });
    }
  }

  return { quarantine, actions };
}

export function workQueue(data = {}) {
  const packRows = heldPackRows(data);
  const actions = [...packRows.actions];
  const live = listCases().filter(isOpenCase);
  const quarantine = live.length
    ? live.map(c => ({
      id: c.id,
      title: c.title,
      detail: c.reason,
      owner: c.owner,
      source: c.source,
      gate: (c.failedGates || [])[0] || 'Human sign-off',
      status: c.status,
      path: c.path || null,
      go: c.go || 'intake',
      kind: 'control'
    }))
    : packRows.quarantine;

  for (const a of ALERTS) {
    actions.push({
      id: `act-${a.id}`,
      title: a.action,
      on: a.title,
      owner: a.owner,
      deadline: a.deadline,
      status: a.status,
      kind: 'alert',
      go: 'alerts'
    });
  }

  const open = ALERTS.filter(a => a.status === 'open' || a.status === 'overdue');
  const overdue = ALERTS.filter(a => a.status === 'overdue');
  return {
    open,
    overdue,
    quarantine,
    actions,
    counts: {
      open: open.length,
      overdue: overdue.length,
      quarantine: quarantine.length,
      actions: actions.length
    }
  };
}
