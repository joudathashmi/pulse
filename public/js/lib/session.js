/**
 * Signed-in desk for the prototype. Swap for ministry SSO later.
 * Roles follow the FDI/GFCF operating model: Data Council, metric owner,
 * steward, methodology board, DMO, DTIT and Committee.
 */

const AUTH_KEY = 'misa-pulse-auth-v1';
const USER_KEY = 'misa-pulse-user-v1';
const DIR_KEY = 'misa-pulse-directory-v1';
const READ_KEY = 'misa-pulse-inbox-read-v1';

/** Governance seats from the methodology (Appendix A · operating model). */
export const ROLE_ORDER = ['admin', 'council', 'methodology', 'owner', 'steward', 'analyst', 'dtit', 'leadership'];

export const ROLES = [
  { id: 'admin', name: 'Admin', nameAr: 'مدير',
    help: 'Creates desks, assigns roles, and can enable or disable access.',
    helpAr: 'ينشئ المكاتب ويعيّن الأدوار ويمكنه تفعيل الوصول أو إيقافه.' },
  { id: 'council', name: 'Council', nameAr: 'المجلس',
    help: 'Data Council seat. Pack-level questions and monthly arbitration.',
    helpAr: 'مقعد مجلس البيانات. أسئلة الحزمة والتحكيم الشهري.' },
  { id: 'methodology', name: 'Method', nameAr: 'المنهج',
    help: 'Method change board and GASTAT liaison.',
    helpAr: 'مجلس تغيير المنهج وارتباط الإحصاء.' },
  { id: 'owner', name: 'KPI', nameAr: 'مؤشر',
    help: 'Owns a certified print. Qualifies the number when asked.',
    helpAr: 'يملك رقماً معتمداً. يؤهّل القيمة عند الطلب.' },
  { id: 'steward', name: 'Steward', nameAr: 'أمين',
    help: 'Holds quality exceptions and source mapping.',
    helpAr: 'يمسك استثناءات الجودة وربط المصدر.' },
  { id: 'analyst', name: 'Analyst', nameAr: 'محلل',
    help: 'Reads the pack. Does not certify a print.',
    helpAr: 'يقرأ الحزمة. لا يعتمد رقماً.' },
  { id: 'dtit', name: 'DTIT', nameAr: 'رقمي',
    help: 'Digital Transformation. Runs the prototype desk.',
    helpAr: 'التحول الرقمي. يدير مكتب النموذج.' },
  { id: 'leadership', name: 'Lead', nameAr: 'قيادة',
    help: 'Committee view of certified prints.',
    helpAr: 'عرض اللجنة للأرقام المعتمدة.' }
];

export const CLEARANCE = [
  { id: 'public', name: 'Public', nameAr: 'عام' },
  { id: 'restricted', name: 'Restricted', nameAr: 'مقيد' },
  { id: 'confidential', name: 'Confidential', nameAr: 'سري' }
];

const SEED = [
  {
    id: 'rana',
    name: 'Rana',
    nameAr: 'رنا',
    initials: 'RA',
    roleId: 'admin',
    dept: 'Digital Transformation',
    deptAr: 'التحول الرقمي وتقنية المعلومات',
    email: 'rana@misa.gov.sa',
    match: 'digital',
    clearance: 'confidential',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'saad',
    name: 'Saad',
    nameAr: 'سعد',
    initials: 'SA',
    roleId: 'admin',
    dept: 'Digital Transformation',
    deptAr: 'التحول الرقمي وتقنية المعلومات',
    email: 'saad@misa.gov.sa',
    match: 'digital',
    clearance: 'confidential',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'joudat',
    name: 'Joudat',
    nameAr: 'جودت',
    initials: 'JO',
    roleId: 'dtit',
    dept: 'Digital Transformation',
    deptAr: 'التحول الرقمي وتقنية المعلومات',
    email: 'joudat@misa.gov.sa',
    match: 'digital',
    clearance: 'restricted',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'yousef',
    name: 'Yousef',
    nameAr: 'يوسف',
    initials: 'YO',
    roleId: 'analyst',
    dept: 'Economic Affairs',
    deptAr: 'الشؤون الاقتصادية',
    email: 'yousef@misa.gov.sa',
    match: 'economic',
    clearance: 'restricted',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'fahad',
    name: 'Fahad',
    nameAr: 'فهد',
    initials: 'FA',
    roleId: 'council',
    dept: 'Assistant Minister office',
    deptAr: 'مكتب مساعد الوزير',
    email: 'fahad@misa.gov.sa',
    match: 'council',
    clearance: 'confidential',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'rehab',
    name: 'Rehab',
    nameAr: 'رحاب',
    initials: 'RE',
    roleId: 'methodology',
    dept: 'Economic Affairs · GASTAT liaison',
    deptAr: 'الشؤون الاقتصادية · ارتباط الإحصاء',
    email: 'rehab@misa.gov.sa',
    match: 'gastat',
    clearance: 'restricted',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'ea',
    name: 'Noura',
    nameAr: 'نورة',
    initials: 'NO',
    roleId: 'owner',
    dept: 'Economic Affairs',
    deptAr: 'الشؤون الاقتصادية',
    email: 'noura@misa.gov.sa',
    match: 'economic',
    clearance: 'restricted',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'ida',
    name: 'Faisal',
    nameAr: 'فيصل',
    initials: 'FI',
    roleId: 'owner',
    dept: 'Investment Development Agency',
    deptAr: 'هيئة تنمية الاستثمار',
    email: 'faisal@misa.gov.sa',
    match: 'investment development',
    clearance: 'restricted',
    pass: 'Pulse2026',
    status: 'active'
  },
  {
    id: 'najd',
    name: 'Najd',
    nameAr: 'نجد',
    initials: 'NJ',
    roleId: 'steward',
    dept: 'Quality · Economic Affairs',
    deptAr: 'الجودة · الشؤون الاقتصادية',
    email: 'najd@misa.gov.sa',
    match: 'economic',
    clearance: 'restricted',
    pass: 'Pulse2026',
    status: 'active'
  }
];

function loadOverlay() {
  try {
    return JSON.parse(localStorage.getItem(DIR_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveOverlay(next) {
  localStorage.setItem(DIR_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent('pulse-auth'));
  return next;
}

function hydrate(row) {
  const role = ROLES.find(r => r.id === row.roleId) || ROLES.find(r => r.id === 'owner');
  return {
    ...row,
    role: role.name,
    roleAr: role.nameAr,
    roleId: role.id
  };
}

export function listUsers() {
  const overlay = loadOverlay();
  const extras = overlay.added || [];
  const disabled = new Set(overlay.disabled || []);
  const patched = overlay.patch || {};
  const seed = SEED.map(u => hydrate({
    ...u,
    ...(patched[u.id] || {}),
    status: disabled.has(u.id) ? 'disabled' : (patched[u.id]?.status || u.status)
  }));
  const more = extras.map(u => hydrate({
    ...u,
    status: disabled.has(u.id) ? 'disabled' : (u.status || 'active')
  }));
  return [...seed, ...more];
}

/** @deprecated use listUsers - kept so older desk switchers do not break */
export const USERS = SEED.map(hydrate);

export function roleById(id) {
  return ROLES.find(r => r.id === id) || ROLES[3];
}

export function isSignedIn() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const { userId } = JSON.parse(raw);
    const user = listUsers().find(u => u.id === userId);
    return Boolean(user && user.status !== 'disabled');
  } catch {
    return false;
  }
}

export function getUser() {
  if (!isSignedIn()) return null;
  try {
    const { userId } = JSON.parse(localStorage.getItem(AUTH_KEY) || '{}');
    return listUsers().find(u => u.id === userId) || null;
  } catch {
    return null;
  }
}

export function signIn(id) {
  const user = listUsers().find(u => u.id === id && u.status !== 'disabled');
  if (!user) return null;
  localStorage.setItem(AUTH_KEY, JSON.stringify({ userId: user.id, at: new Date().toISOString() }));
  localStorage.setItem(USER_KEY, user.id);
  window.dispatchEvent(new CustomEvent('pulse-auth'));
  window.dispatchEvent(new CustomEvent('pulse-desk'));
  return user;
}

function loginKey(user) {
  return [
    user.id,
    user.name,
    user.nameAr,
    user.email,
    (user.email || '').split('@')[0]
  ].map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
}

export function login(username, password) {
  const user = String(username || '').trim().toLowerCase();
  const pass = String(password || '').trim();
  if (!user || !pass) return null;
  const hit = listUsers().find(u => {
    if (u.status === 'disabled') return false;
    const keys = loginKey(u);
    return keys.includes(user) || keys.some(k => k.split(/\s+/)[0] === user);
  });
  if (!hit) return null;
  const expected = String(hit.pass || '').trim();
  if (expected.toLowerCase() !== pass.toLowerCase()) return null;
  return signIn(hit.id);
}

export function signOut() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new CustomEvent('pulse-auth'));
  window.dispatchEvent(new CustomEvent('pulse-desk'));
}

export function canOpenAdmin(user = getUser()) {
  return user?.roleId === 'admin';
}

export function canEditDirectory(user = getUser()) {
  return user?.roleId === 'admin';
}

export function addUser({ name, roleId, dept, email, pass, clearance = 'restricted' }) {
  if (!canEditDirectory()) return null;
  const clean = (name || '').trim();
  if (!clean) return null;
  const role = roleById(roleId);
  const overlay = loadOverlay();
  const added = overlay.added || [];
  const id = `u-${Date.now().toString(36)}`;
  const parts = clean.split(/\s+/);
  const initials = ((parts[0]?.[0] || 'U') + (parts[1]?.[0] || parts[0]?.[1] || 'S')).toUpperCase();
  const mail = (email || `${parts[0].toLowerCase()}@misa.gov.sa`).trim();
  const row = {
    id,
    name: clean,
    nameAr: clean,
    initials,
    roleId: role.id,
    dept: (dept || role.name).trim(),
    deptAr: (dept || role.nameAr).trim(),
    email: mail,
    match: (dept || role.name).toLowerCase(),
    clearance: CLEARANCE.some(c => c.id === clearance) ? clearance : 'restricted',
    pass: String(pass || clean).trim() || 'Pulse2026',
    status: 'active',
    added: true
  };
  overlay.added = [...added, row];
  saveOverlay(overlay);
  return hydrate(row);
}

export function patchUser(id, patch = {}) {
  if (!canEditDirectory()) return listUsers();
  const current = listUsers().find(u => u.id === id);
  if (!current) return listUsers();
  const nextRole = patch.roleId || current.roleId;
  const admins = listUsers().filter(u => u.roleId === 'admin' && u.status !== 'disabled');
  if (current.roleId === 'admin' && nextRole !== 'admin' && admins.length <= 1) return listUsers();
  const allowed = {};
  if (patch.roleId && ROLES.some(r => r.id === patch.roleId)) allowed.roleId = patch.roleId;
  if (patch.dept != null) {
    allowed.dept = String(patch.dept).trim() || current.dept;
    allowed.deptAr = allowed.dept;
    allowed.match = allowed.dept.toLowerCase();
  }
  if (patch.email != null) allowed.email = String(patch.email).trim() || current.email;
  if (patch.clearance && CLEARANCE.some(c => c.id === patch.clearance)) allowed.clearance = patch.clearance;
  if (patch.pass) allowed.pass = String(patch.pass).trim();
  if (!Object.keys(allowed).length) return listUsers();
  const overlay = loadOverlay();
  const extras = overlay.added || [];
  const i = extras.findIndex(u => u.id === id);
  if (i >= 0) {
    extras[i] = { ...extras[i], ...allowed };
    overlay.added = extras;
  } else {
    overlay.patch = { ...(overlay.patch || {}), [id]: { ...(overlay.patch?.[id] || {}), ...allowed } };
  }
  saveOverlay(overlay);
  return listUsers();
}

export function setUserStatus(id, status) {
  const me = getUser();
  if (me?.id === id) return listUsers();
  const overlay = loadOverlay();
  const disabled = new Set(overlay.disabled || []);
  if (status === 'disabled') disabled.add(id);
  else disabled.delete(id);
  overlay.disabled = [...disabled];
  saveOverlay(overlay);
  return listUsers();
}

export function setUser(id) {
  return signIn(id);
}

export function userOwns(user, owner = '') {
  const hay = String(owner).toLowerCase();
  const needle = String(user?.match || '').toLowerCase();
  if (!user || !needle) return false;
  return hay.includes(needle) || needle.split(/[·,|/]/).some(p => {
    const bit = p.trim();
    return bit.length > 2 && hay.includes(bit);
  });
}

export function loadReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

export function markRead(ids) {
  const next = loadReadIds();
  for (const id of ids) next.add(id);
  localStorage.setItem(READ_KEY, JSON.stringify([...next]));
  return next;
}

export function displayName(user, ar) {
  if (!user) return '';
  return ar && user.nameAr ? user.nameAr : user.name;
}

export function displayRole(user, ar) {
  if (!user) return '';
  const role = roleById(user.roleId);
  return ar && role.nameAr ? role.nameAr : role.name;
}

export function displayDept(user, ar) {
  if (!user) return '';
  return ar && user.deptAr ? user.deptAr : user.dept;
}

export function displayClearance(id, ar) {
  const row = CLEARANCE.find(c => c.id === id) || CLEARANCE[1];
  return ar ? row.nameAr : row.name;
}
