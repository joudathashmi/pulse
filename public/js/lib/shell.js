const KEY = 'misa-pulse-shell-v2';

export function getShell() {
  return localStorage.getItem(KEY) === 'phone' ? 'phone' : 'desk';
}

export function applyShell(id) {
  const shell = id === 'desk' ? 'desk' : 'phone';
  document.documentElement.setAttribute('data-shell', shell);
  localStorage.setItem(KEY, shell);
  return shell;
}

export function initShell() {
  return applyShell(getShell());
}
