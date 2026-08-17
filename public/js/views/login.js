import { $ } from '../lib/dom.js';
import { t } from '../i18n.js';
import { login } from '../lib/session.js';

/** Closed gate. No directory, no walk-in desk. */
export function mountLogin(host) {
  if (!host) return { show() {}, hide() {} };

  function render(err = '') {
    const s = t();
    host.innerHTML = `
      <section class="auth-gate" aria-label="${s.signInTitle || 'Sign in'}">
        <div class="auth-card">
          <div class="auth-mark">
            <img class="auth-logo auth-logo-on-dark" src="./brand/misa-logo-white.svg" alt="Ministry of Investment">
            <img class="auth-logo auth-logo-on-light" src="./brand/misa-logo-dark.svg" alt="Ministry of Investment">
          </div>
          <p class="auth-prod">${s.product || s.brand || 'Investment Pulse'}</p>
          <h1 class="auth-title">${s.signInTitle || 'Sign in'}</h1>
          <p class="auth-lede">${s.signInLegal || 'Authorised ministry use only.'}</p>
          <form class="auth-form" data-form>
            <label>${s.signInUser || 'Username'}
              <input name="user" type="text" autocomplete="username" required autofocus placeholder="${s.signInUserHint || 'First name'}" />
            </label>
            <label>${s.signInPass || 'Password'}
              <input name="pass" type="password" autocomplete="current-password" required />
            </label>
            <p class="auth-err ${err ? '' : 'hide'}" data-err role="alert">${err}</p>
            <button type="submit" class="btn-primary auth-go">${s.signInBtn || 'Sign in'}</button>
          </form>
        </div>
      </section>`;
    const form = $('[data-form]', host);
    if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const user = form.querySelector('[name="user"]')?.value || '';
      const pass = form.querySelector('[name="pass"]')?.value || '';
      const ok = login(user, pass);
      if (ok) return;
      const box = $('[data-err]', host);
      if (box) {
        box.textContent = s.signInFail || 'Username or password is not recognised.';
        box.classList.remove('hide');
      }
      const passEl = form.querySelector('[name="pass"]');
      if (passEl) passEl.value = '';
      passEl?.focus();
    });
  }

  function show() {
    host.hidden = false;
    document.body.classList.add('signed-out');
    document.body.classList.remove('signed-in');
    render();
  }

  function hide() {
    host.hidden = true;
    host.innerHTML = '';
    document.body.classList.remove('signed-out');
    document.body.classList.add('signed-in');
  }

  return { show, hide, refresh: () => { if (!host.hidden) render(); } };
}
