/* Toggle Email/Phone tab + arahkan submit ke handler yang benar */
const $ = (s, r=document) => r.querySelector(s);
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

function show(view){
  const emailView = $('[data-view="email"]');
  const phoneView = $('[data-view="phone"]');
  const tabEmail  = $('[data-tab="email"]');
  const tabPhone  = $('[data-tab="phone"]');

  if (view === 'phone') {
    emailView?.classList.add('hidden');
    phoneView?.classList.remove('hidden');
    tabEmail?.classList.remove('active');
    tabPhone?.classList.add('active');
  } else {
    phoneView?.classList.add('hidden');
    emailView?.classList.remove('hidden');
    tabPhone?.classList.remove('active');
    tabEmail?.classList.add('active');
  }
  localStorage.setItem('last_login_tab', view);
}

document.addEventListener('DOMContentLoaded', () => {
  // tombol tab
  on($('[data-tab="email"]'), 'click', (e)=>{e.preventDefault(); show('email')});
  on($('[data-tab="phone"]'), 'click', (e)=>{e.preventDefault(); show('phone')});

  // default tab
  const q = new URLSearchParams(location.search);
  show(q.get('mode')==='phone' ? 'phone' : (localStorage.getItem('last_login_tab') || 'email'));

  // wiring submit → FORM TERPISAH
  const formEmail = $('#formEmail');
  const formPhone = $('#formPhone');

  // handler dari file yang sudah ada
  // (pastikan fungsi ini memang diexport default/named di file kamu)
  import('./auth-email.js').then(mod=>{
    formEmail && on(formEmail,'submit', (ev)=>mod.handleEmailLogin
      ? mod.handleEmailLogin(ev)
      : mod.default?.(ev));
  }).catch(console.error);

  import('./auth-phone.js').then(mod=>{
    formPhone && on(formPhone,'submit', (ev)=>mod.handlePhoneLogin
      ? mod.handlePhoneLogin(ev)
      : mod.default?.(ev));
  }).catch(console.error);
});
