// Minimal tab + submit controller
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const on = (el, ev, fn) => el && el.addEventListener(ev, fn);

function setMode(mode){
  document.body.dataset.loginMode = mode;        // untuk CSS/debug
  localStorage.setItem('last_login_tab', mode);  // ingat pilihan
  // tampilkan/semmbunyikan blok input jika ada penanda
  const emailBlock = document.querySelector('[data-view="email"]');
  const phoneBlock = document.querySelector('[data-view="phone"]');
  if (emailBlock && phoneBlock){
    if (mode === 'phone'){ emailBlock.classList.add('hidden'); phoneBlock.classList.remove('hidden'); }
    else { phoneBlock.classList.add('hidden'); emailBlock.classList.remove('hidden'); }
  }
  // tandai tab aktif
  $$('[data-tab]').forEach(t => t.classList.remove('active'));
  const act = document.querySelector(`[data-tab="${mode}"]`);
  act && act.classList.add('active');
}

function currentMode(){
  return document.body.dataset.loginMode || 'email';
}

document.addEventListener('DOMContentLoaded', () => {
  // Hook tombol tab (kalau ada)
  on($('[data-tab="email"]'),  'click', e => { e.preventDefault(); setMode('email'); });
  on($('[data-tab="phone"]'),  'click', e => { e.preventDefault(); setMode('phone'); });

  // Mode awal dari URL (?mode=phone) → else dari cache → email
  const q = new URLSearchParams(location.search);
  setMode(q.get('mode') === 'phone' ? 'phone' : (localStorage.getItem('last_login_tab') || 'email'));

  // Ambil form pertama di halaman (kebanyakan 1 form)
  const form = document.querySelector('form') || document.getElementById('loginForm');
  if (!form) return;

  // Ubah submit supaya nembak handler sesuai tab
  on(form, 'submit', async (ev) => {
    ev.preventDefault();
    const mode = currentMode();

    try {
      if (mode === 'phone') {
        if (typeof window.handlePhoneLogin === 'function') {
          await window.handlePhoneLogin(ev);
        } else {
          alert('Handler login telepon belum tersedia (handlePhoneLogin).');
        }
      } else {
        if (typeof window.handleEmailLogin === 'function') {
          await window.handleEmailLogin(ev);
        } else {
          alert('Handler login email belum tersedia (handleEmailLogin).');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Login gagal: ' + (e?.message || e));
    }
  });
});
