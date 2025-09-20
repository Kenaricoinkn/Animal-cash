// js/features/auth-tabs.js
(() => {
  const MODE = (window.AUTH_MODE || 'login').toLowerCase(); // 'login' | 'register'
  const isReg = MODE === 'register';

  // Elemen umum
  const tabEmail  = document.getElementById('tabEmail');
  const tabPhone  = document.getElementById('tabPhone');
  const emailForm = document.getElementById('emailForm');
  const phoneForm = document.getElementById('phoneForm');

  // Label sesuai mode
  tabEmail.textContent = isReg ? 'Daftar Email'   : 'Masuk Email';
  tabPhone.textContent = isReg ? 'Daftar Telepon' : 'Masuk Telepon';

  document.getElementById('emailSubmit').textContent = isReg ? 'Daftar' : 'Masuk';
  document.getElementById('phoneSubmit').textContent = isReg ? 'Daftar' : 'Masuk';

  // Kolom konfirmasi password hanya saat daftar
  const pass2WrapEmail = document.getElementById('passConfirmWrapEmail');
  const pass2WrapPhone = document.getElementById('passConfirmWrapPhone');
  (isReg ? pass2WrapEmail.classList.remove('hidden') : pass2WrapEmail.classList.add('hidden'));
  (isReg ? pass2WrapPhone.classList.remove('hidden') : pass2WrapPhone.classList.add('hidden'));

  // Switch tab
  function activate(which) {
    const emailActive = which === 'email';
    tabEmail.classList.toggle('tab-active', emailActive);
    tabPhone.classList.toggle('tab-active', !emailActive);
    emailForm.classList.toggle('hidden', !emailActive);
    phoneForm.classList.toggle('hidden', emailActive);
  }
  tabEmail.addEventListener('click', () => activate('email'));
  tabPhone.addEventListener('click', () => activate('phone'));
  activate('email'); // default

  // Toggle “lihat sandi”
  document.querySelectorAll('.eye-btn').forEach(btn => {
    const sel = btn.getAttribute('data-toggle');
    const inp = document.querySelector(sel);
    btn.addEventListener('click', () => {
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
  });

  // Teks link pindah halaman
  const switchLine = document.getElementById('switchLine');
  const switchLink = document.getElementById('switchLink');
  if (isReg) {
    switchLine.textContent = 'Sudah memiliki akun?';
    switchLink.textContent  = 'Gabung';
    switchLink.href         = 'index.html';
  } else {
    switchLine.textContent = 'Belum punya akun?';
    switchLink.textContent  = 'Daftar';
    switchLink.href         = 'register.html';
  }
})();
