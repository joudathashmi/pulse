/** Share + assign helpers for the Pulse (prototype: client-side only). */

export function shareEmail({ subject, body }) {
  const href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  window.location.href = href;
}

export function shareTeams({ title, text, url }) {
  const u = url || location.href;
  const msg = `${title}\n\n${text}\n\n${u}`;
  const shareUrl = `https://teams.microsoft.com/share?href=${encodeURIComponent(u)}&msgText=${encodeURIComponent(`${title} - ${text}`)}`;
  window.open(shareUrl, '_blank', 'noopener');
  return msg;
}

export function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.left = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  return Promise.resolve();
}

export function pulseShareBody(data = {}) {
  const fdi = data.brief?.headlines?.fdi;
  const gfcf = data.brief?.headlines?.gfcf;
  return [
    'Investment Pulse Operating System · certified',
    `FDI ${fdi?.pulseValue ?? '-'} SAR bn (${fdi?.status || '-'}) · target ${fdi?.yearTarget ?? '-'}`,
    `GFCF ${gfcf?.pulseValue ?? '-'} SAR bn (${gfcf?.status || '-'}) · target ${gfcf?.yearTarget ?? '-'}`,
    `As of ${data.brief?.source?.asOfLabel || ''} · ${location.href}`
  ].join('\n');
}
