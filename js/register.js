// js/register.js
document.addEventListener('DOMContentLoaded', () => {
  const fb = window.App?.firebase;
  if (!fb) return;

  const { auth } = fb;

  // ---- Redirect otomatis setelah berhasil daftar/login (persisten) ----
  let alreadyNavigated = false;
  const goDash = () => {
    if (alreadyNavigated) return;
    alreadyNavigated = true;
    location.href = 'dashboard.html';
  };

  // Kalau user sudah login (mis. habis refresh), langsung ke dashboard
  try {
    setTimeout(() => {
      if (auth?.currentUser) goDash();
    }, 0);
  } catch {}

  // Listener auth state
  try {
    fb.auth.onAuthStateChanged((user) => {
      if (user) goDash();
    });
  } catch (e) {
    console.warn('onAuthStateChanged error:', e);
  }

  // ===== Helpers =====
  const onlyDigits = s => (s || '').replace(/[^\d]/g, '');
  const buildPhone = () => {
    const cc  = document.getElementById('country')?.value || '';
    const ph  = onlyDigits(document.getElementById('phone')?.value || '');
    if (!cc || !ph) return '';
    const ccDigits = onlyDigits(cc);
    return `+${ccDigits}${ph}`;
  };
  const showError = (err) => {
    const code = (err?.code || '').toLowerCase();
    if (code.includes('email-already-in-use')) {
      alert('Nomor/email sudah terdaftar, silakan masuk.');
    } else if (code.includes('weak-password')) {
      alert('Kata sandi terlalu lemah. Gunakan minimal 6 karakter.');
    } else {
      alert(err?.message || 'Gagal memproses pendaftaran.');
    }
  };
  const disableBtn = (btn, text) => {
    if (!btn) return;
    btn.dataset._old = btn.textContent;
    btn.disabled = true;
    btn.textContent = text || 'Memproses...';
    btn.classList.add('opacity-60','pointer-events-none');
  };
  const enableBtn = (btn) => {
    if (!btn) return;
    btn.disabled = false;
    btn.textContent = btn.dataset._old || 'Daftar';
    btn.classList.remove('opacity-60','pointer-events-none');
  };

  // ===== Email register =====
  const emailForm = document.getElementById('emailForm');
  if (emailForm) {
    emailForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('email')?.value?.trim() || '';
      const pass  = document.getElementById('password')?.value || '';
      const pass2 = document.getElementById('password2')?.value || '';
      const btn   = emailForm.querySelector('button[type="submit"]');

      if (!email || !pass) { alert('Isi email dan sandi.'); return; }
      if (pass !== pass2)   { alert('Ulangi sandi harus sama.'); return; }

      try {
        disableBtn(btn, 'Mendaftar…');
        const uc = await fb.signUpEmail(email, pass);
        // Buat doc users/{uid} default farm kalau belum ada
        try { await fb.ensureUserDoc(uc.user.uid, {}); } catch {}
        // Jangan redirect manual — biarkan onAuthStateChanged yang handle
      } catch(err) {
        console.error(err);
        showError(err);
        enableBtn(btn);
      }
    });
  }

  // ===== Phone register =====
  const phoneForm = document.getElementById('phoneForm');
  if (phoneForm) {
    phoneForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const phone = buildPhone();
      const pass  = document.getElementById('phonePass')?.value || '';
      const pass2 = document.getElementById('phonePass2')?.value || '';
      const btn   = phoneForm.querySelector('button[type="submit"]');

      if (!phone || !pass) { alert('Isi telepon dan sandi.'); return; }
      if (pass !== pass2)  { alert('Ulangi sandi harus sama.'); return; }

      try {
        disableBtn(btn, 'Mendaftar…');
        const uc = await fb.signUpPhonePass(phone, pass);
        // Buat doc users/{uid} default farm kalau belum ada
        try { await fb.ensureUserDoc(uc.user.uid, {}); } catch {}
        // Jangan redirect manual — biarkan onAuthStateChanged yang handle
      } catch(err) {
        console.error(err);
        showError(err);
        enableBtn(btn);
      }
    });
  }
});
