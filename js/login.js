// js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const fb = window.App?.firebase;
  if (!fb) return;

  const { auth } = fb;

  // ---- Redirect otomatis bila sudah login (persisten) ----
  // Pastikan firebase-init.js sudah set persistence.
  let alreadyNavigated = false;
  const goDash = () => {
    if (alreadyNavigated) return;
    alreadyNavigated = true;
    location.href = 'dashboard.html';
  };

  // Kalau user sudah login (mis. habis refresh), langsung ke dashboard
  try {
    // Beberapa hosting butuh sedikit delay agar auth siap
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
    if (code.includes('user-not-found')) {
      alert('Maaf, Anda belum terdaftar. Silakan daftar dulu.');
    } else if (code.includes('wrong-password')) {
      alert('Kata sandi salah.');
    } else if (code.includes('invalid-credential')) {
      alert('Nomor atau sandi tidak cocok. Pastikan sesuai saat mendaftar.');
    } else if (code.includes('too-many-requests')) {
      alert('Terlalu banyak percobaan. Coba lagi beberapa menit lagi.');
    } else {
      alert(err?.message || 'Gagal masuk.');
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
    btn.textContent = btn.dataset._old || 'Masuk';
    btn.classList.remove('opacity-60','pointer-events-none');
  };

  // ===== Email login =====
  const emailForm = document.getElementById('emailForm');
  if (emailForm) {
    emailForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('email')?.value?.trim() || '';
      const pass  = document.getElementById('password')?.value || '';
      const btn   = emailForm.querySelector('button[type="submit"]');

      if (!email || !pass) { alert('Isi email dan sandi.'); return; }

      try {
        disableBtn(btn, 'Masuk…');
        await fb.signInEmail(email, pass);
        // Jangan redirect di sini — biarkan onAuthStateChanged yang handle
      } catch(err) {
        console.error(err);
        showError(err);
        enableBtn(btn);
      }
    });
  }

  // ===== Phone login =====
  const phoneForm = document.getElementById('phoneForm');
  if (phoneForm) {
    phoneForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const phone = buildPhone();
      const pass  = document.getElementById('phonePass')?.value || '';
      const btn   = phoneForm.querySelector('button[type="submit"]');

      if (!phone || !pass) { alert('Isi telepon dan sandi.'); return; }

      // Debug: email mapping (jangan hapus kalau perlu trace)
      const mapped = (phone.startsWith('+') ? phone.slice(1) : phone) + '@phone.user';
      console.log('[Login/Phone] mapped email:', mapped);

      try {
        disableBtn(btn, 'Masuk…');
        await fb.signInPhonePass(phone, pass);
        // Jangan redirect di sini — biarkan onAuthStateChanged yang handle
      } catch(err) {
        console.error(err);
        showError(err);
        enableBtn(btn);
      }
    });
  }
});
