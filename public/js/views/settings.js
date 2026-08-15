import { el, $ } from '../lib/dom.js';
import { t, getLang } from '../i18n.js';
import { PAGE_HELP } from '../lib/assistant.js';
import { GLOSSARY } from '../fixtures/glossary.js';
import { ownerForMetric } from '../lib/queries.js';
import { getKpiMeta } from '../fixtures/kpiMeta.js';
import {
  canOpenAdmin, getUser, listUsers, displayName, displayDept
} from '../lib/session.js';
import { loadOwnerPatch, setOwnerPatch, loadMailPrefs, saveMailPrefs } from '../lib/prefs.js';

let section = 'help';

const SECTIONS = [
  { id: 'help', label: 'Help', labelAr: 'مساعدة' },
  { id: 'glossary', label: 'Glossary', labelAr: 'المسرد' },
  { id: 'owners', label: 'KPI owners', labelAr: 'ملاك المؤشرات' },
  { id: 'mail', label: 'Email alerts', labelAr: 'تنبيهات البريد' }
];

function packRows(brief) {
  const headlines = ['fdi', 'gfcf'].map(id => {
    const h = brief?.headlines?.[id] || {};
    const info = ownerForMetric(id, brief);
    const meta = getKpiMeta(id, brief);
    return {
      id,
      kind: 'Headline',
      name: h.name || meta?.name || id.toUpperCase(),
      owner: info.owner,
      contact: info.contact,
      source: h.source || meta?.source || '-',
      method: h.method || meta?.method || '-',
      value: h.pulseValue ?? info.value
    };
  });
  const signals = (brief?.signals || []).map(sig => {
    const info = ownerForMetric(sig.id, brief);
    return {
      id: sig.id,
      kind: 'Signal',
      name: sig.name,
      owner: info.owner,
      contact: info.contact,
      source: sig.source || '-',
      method: sig.freq || '-',
      value: sig.value
    };
  });
  return [...headlines, ...signals];
}

function ownerChoices() {
  const desks = listUsers().filter(u => u.status !== 'disabled');
  const depts = [
    'Economic Affairs',
    'Investment Development Agency',
    'Digital Transformation',
    'GASTAT liaison · Economic Affairs',
    'SAMA liaison · Economic Affairs',
    'Data Council'
  ];
  return { desks, depts };
}

function paintHelp(root, { startTour, go }) {
  const s = t();
  const page = PAGE_HELP.pulse;
  const items = [
    { label: s.setGuideStart || 'Start the board guide', run: () => startTour?.() },
    { label: s.setOpenGlossary || 'Open the data glossary', run: () => { section = 'glossary'; renderSettings(root, window.__pulseSettingsData, window.__pulseSettingsCtx); } },
    { label: s.setOpenOwners || 'Open KPI owners', run: () => { section = 'owners'; renderSettings(root, window.__pulseSettingsData, window.__pulseSettingsCtx); } },
    { label: s.setOpenMail || 'Configure email alerts', run: () => { section = 'mail'; renderSettings(root, window.__pulseSettingsData, window.__pulseSettingsCtx); } },
    { label: s.setOpenAlerts || 'Open Alerts and owners', run: () => go?.('alerts') },
    { label: s.setOpenAbout || 'What is sourced', run: () => go?.('about') }
  ];
  return `
    <article class="wh-card">
      <div class="wh-k">${s.setHelpMenu || 'Help menu'}</div>
      <p class="set-lede">${page.hint}</p>
      <div class="set-menu">
        ${items.map((item, i) => `<button type="button" class="set-menu-btn" data-help="${i}">${item.label}</button>`).join('')}
      </div>
    </article>
    <article class="wh-card">
      <div class="wh-k">${s.setHelpGuide || 'Help guide'}</div>
      <ol class="set-guide">
        <li>${s.setGuide1 || 'Sign in with your first name. The board is the certified pack: one gold orb, two headlines, 20 signals.'}</li>
        <li>${s.setGuide2 || 'Tap the orb or a row to trace a number: headline, indicator, sector or region, source record.'}</li>
        <li>${s.setGuide3 || 'Your desk holds messages, assignments, KPIs you own, and Settings. Sign out is on the desk and in Display.'}</li>
        <li>${s.setGuide4 || 'Ask Me answers from the pack only. Help, the glossary, owners and email alerts live in Display and on this desk.'}</li>
      </ol>
      <button type="button" class="btn-primary" data-start-guide>${s.setGuideStart || 'Start the board guide'}</button>
    </article>`;
}

function paintGlossary() {
  const s = t();
  const ar = getLang() === 'ar';
  return `
    <article class="wh-card">
      <div class="wh-k">${s.setGlossary || 'Data glossary'}</div>
      <p class="set-lede">${s.setGlossaryLede || 'Words used on the board. Pack language only.'}</p>
      <div class="set-gloss">
        ${GLOSSARY.map(g => `
          <article class="set-gloss-row">
            <b>${ar && g.termAr ? g.termAr : g.term}</b>
            <p>${ar && g.bodyAr ? g.bodyAr : g.body}</p>
          </article>`).join('')}
      </div>
    </article>`;
}

function paintOwners(brief) {
  const s = t();
  const admin = canOpenAdmin();
  const rows = packRows(brief);
  const { desks, depts } = ownerChoices();
  const patch = loadOwnerPatch();
  return `
    <article class="wh-card">
      <div class="wh-k">${s.setOwners || 'KPI and owners'}</div>
      <p class="set-lede">${admin
    ? (s.setOwnersAdmin || 'Admin can assign a desk or a unit. The certified print does not change.')
    : (s.setOwnersView || 'Who owns each headline and signal. Ask the owner when a value needs qualification.')}</p>
      <div class="set-own-list">
        ${rows.map(r => {
          const current = patch[r.id]?.userId || patch[r.id]?.owner || r.owner;
          const options = [
            ...depts.map(d => `<option value="dept:${d}" ${current === d ? 'selected' : ''}>${d}</option>`),
            ...desks.map(u => `<option value="user:${u.id}" ${patch[r.id]?.userId === u.id ? 'selected' : ''}>${displayName(u)} · ${displayDept(u)}</option>`)
          ].join('');
          return `<article class="set-own">
            <div class="set-own-top">
              <b>${r.name}</b>
              <span class="set-own-kind">${r.kind}</span>
            </div>
            <div class="set-sub">${r.source} · ${r.method}</div>
            <label class="set-own-lab">${s.owner || 'Owner'}
              ${admin
                ? `<select class="set-select" data-own="${r.id}">${options}</select>`
                : `<span class="set-own-val">${r.owner}</span>`}
            </label>
            <div class="set-own-mail mono">${r.contact || '—'}</div>
            <button type="button" class="wh-act" data-ask="${r.id}">${s.askOwner || 'Ask owner'}</button>
          </article>`;
        }).join('')}
      </div>
    </article>`;
}

function paintMail() {
  const s = t();
  const prefs = loadMailPrefs(getUser());
  return `
    <article class="wh-card">
      <div class="wh-k">${s.setMail || 'Email alerts'}</div>
      <p class="set-lede">${s.setMailLede || 'Choose what this desk is notified about. The prototype stores the preference here. It does not send mail.'}</p>
      <form class="set-form" data-mail>
        <label>${s.setMailTo || 'Send to'}
          <input name="email" type="email" required value="${prefs.email || ''}" autocomplete="email" />
        </label>
        <label class="set-check"><input type="checkbox" name="onRisk" ${prefs.onRisk ? 'checked' : ''} /> ${s.setMailRisk || 'At-risk signals'}</label>
        <label class="set-check"><input type="checkbox" name="onWatch" ${prefs.onWatch ? 'checked' : ''} /> ${s.setMailWatch || 'Watch signals'}</label>
        <label class="set-check"><input type="checkbox" name="onOverdue" ${prefs.onOverdue ? 'checked' : ''} /> ${s.setMailOverdue || 'Overdue assignments'}</label>
        <label class="set-check"><input type="checkbox" name="onReply" ${prefs.onReply ? 'checked' : ''} /> ${s.setMailReply || 'Owner replies'}</label>
        <label>${s.setMailDigest || 'Cadence'}
          <select name="digest">
            <option value="immediate" ${prefs.digest === 'immediate' ? 'selected' : ''}>${s.setMailNow || 'Immediate'}</option>
            <option value="daily" ${prefs.digest === 'daily' ? 'selected' : ''}>${s.setMailDaily || 'Daily digest'}</option>
            <option value="off" ${prefs.digest === 'off' ? 'selected' : ''}>${s.setMailOff || 'Off'}</option>
          </select>
        </label>
        <p class="set-ok hide" data-mail-ok role="status">${s.setMailSaved || 'Saved on this desk.'}</p>
        <button type="submit" class="btn-primary">${s.setMailSave || 'Save alerts'}</button>
      </form>
    </article>`;
}

export function setSettingsSection(id) {
  if (id) section = id;
}

export function renderSettings(root, data, ctx = {}) {
  if (!root) return;
  if (ctx.startSection) section = ctx.startSection;
  window.__pulseSettingsData = data;
  window.__pulseSettingsCtx = ctx;
  const s = t();
  const ar = getLang() === 'ar';
  const brief = data?.brief || {};

  root.innerHTML = `
    <div class="set-pane" data-tour="settings">
      <div class="seg set-tabs" data-set-tabs>
        <span class="seg-track">
          ${SECTIONS.map(x => `<button type="button" class="seg-opt ${section === x.id ? 'on' : ''}" data-set="${x.id}">${ar ? x.labelAr : x.label}</button>`).join('')}
        </span>
      </div>
      <div data-set-body></div>
      <p class="wh-est">${s.signInLegal || 'Authorised ministry use only.'}</p>
    </div>`;

  const body = $('[data-set-body]', root);
  if (section === 'glossary') body.innerHTML = paintGlossary();
  else if (section === 'owners') body.innerHTML = paintOwners(brief);
  else if (section === 'mail') body.innerHTML = paintMail();
  else body.innerHTML = paintHelp(root, ctx);

  for (const b of root.querySelectorAll('[data-set]')) {
    b.onclick = () => {
      section = b.dataset.set;
      renderSettings(root, data, ctx);
    };
  }

  const helpItems = [
    () => ctx.startTour?.(),
    () => { section = 'glossary'; renderSettings(root, data, ctx); },
    () => { section = 'owners'; renderSettings(root, data, ctx); },
    () => { section = 'mail'; renderSettings(root, data, ctx); },
    () => ctx.go?.('alerts'),
    () => ctx.go?.('about')
  ];
  for (const b of root.querySelectorAll('[data-help]')) {
    b.onclick = () => helpItems[Number(b.dataset.help)]?.();
  }
  $('[data-start-guide]', root)?.addEventListener('click', () => ctx.startTour?.());

  for (const sel of root.querySelectorAll('[data-own]')) {
    sel.onchange = () => {
      const raw = sel.value || '';
      if (raw.startsWith('user:')) {
        const user = listUsers().find(u => u.id === raw.slice(5));
        if (!user) return;
        setOwnerPatch(sel.dataset.own, {
          owner: displayName(user),
          contact: user.email,
          userId: user.id
        });
      } else {
        const owner = raw.replace(/^dept:/, '');
        setOwnerPatch(sel.dataset.own, { owner, contact: '', userId: '' });
      }
      renderSettings(root, data, ctx);
    };
  }

  for (const b of root.querySelectorAll('[data-ask]')) {
    b.onclick = () => {
      const id = b.dataset.ask;
      const info = ownerForMetric(id, brief);
      ctx.openAskOwner?.({
        metric: id,
        value: String(info.value ?? ''),
        owner: info.owner,
        ownerContact: info.contact,
        title: info.label || id
      });
    };
  }

  const form = $('[data-mail]', root);
  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    saveMailPrefs({
      email: form.email.value,
      onRisk: form.onRisk.checked,
      onWatch: form.onWatch.checked,
      onOverdue: form.onOverdue.checked,
      onReply: form.onReply.checked,
      digest: form.digest.value
    });
    $('[data-mail-ok]', root)?.classList.remove('hide');
  });
}
