// js/auth-tabs.js
document.addEventListener('DOMContentLoaded', () => {
  const MODE = (window.AUTH_MODE || 'login').toLowerCase(); // 'login' | 'register'
  const isReg = MODE === 'register';

  const tabEmail  = document.getElementById('tabEmail');
  const tabPhone  = document.getElementById('tabPhone');
  const emailForm = document.getElementById('emailForm');
  const phoneForm = document.getElementById('phoneForm');

  if (!tabEmail || !tabPhone || !emailForm || !phoneForm) return;

  // Label tab
  tabEmail.textContent = isReg ? 'Daftar Email'   : 'Masuk Email';
  tabPhone.textContent = isReg ? 'Daftar Telepon' : 'Masuk Telepon';
  tabEmail.type = 'button'; tabPhone.type = 'button';

  // Label tombol submit
  const emailSubmit = document.getElementById('emailSubmit');
  const phoneSubmit = document.getElementById('phoneSubmit');
  if (emailSubmit) emailSubmit.textContent = isReg ? 'Daftar' : 'Masuk';
  if (phoneSubmit) phoneSubmit.textContent = isReg ? 'Daftar' : 'Masuk';

  // Field konfirmasi (hanya register)
  document.getElementById('passConfirmWrapEmail')?.classList.toggle('hidden', !isReg);
  document.getElementById('passConfirmWrapPhone')?.classList.toggle('hidden', !isReg);

  function activate(which){
    const emailActive = which === 'email';
    tabEmail.classList.toggle('tab-active', emailActive);
    tabPhone.classList.toggle('tab-active', !emailActive);
    emailForm.classList.toggle('hidden', !emailActive);
    phoneForm.classList.toggle('hidden', emailActive);
  }
  tabEmail.addEventListener('click', e => { e.preventDefault(); activate('email'); });
  tabPhone.addEventListener('click', e => { e.preventDefault(); activate('phone'); });
  activate('email');

  // Toggle “mata”
  document.querySelectorAll('.eye-btn').forEach(btn=>{
    const sel = btn.getAttribute('data-toggle');
    const inp = sel ? document.querySelector(sel) : null;
    if (!inp) return;
    btn.addEventListener('click', (e)=>{
      e.preventDefault();
      inp.type = (inp.type === 'password') ? 'text' : 'password';
    });
  });

  // Switch link bawah
  const switchLine = document.getElementById('switchLine');
  const switchLink = document.getElementById('switchLink');
  if (switchLine && switchLink) {
    if (isReg) {
      switchLine.textContent = 'Sudah memiliki akun?';
      switchLink.textContent  = 'Gabung';
      switchLink.href         = 'index.html';
    } else {
      switchLine.textContent = 'Belum punya akun?';
      switchLink.textContent  = 'Daftar';
      switchLink.href         = 'register.html';
    }
  }
});
