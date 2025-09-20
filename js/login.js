// js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const fb = window.App?.firebase;
  if (!fb) return;

  const onlyDigits = s => (s || '').replace(/[^\d]/g,'');
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
    } else {
      alert(err?.message || 'Gagal masuk.');
    }
  };

  // ===== Email login =====
  document.getElementById('emailForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('email')?.value?.trim() || '';
    const pass  = document.getElementById('password')?.value || '';
    if (!email || !pass) { alert('Isi email dan sandi.'); return; }
    try {
      await fb.signInEmail(email, pass);
      location.href = 'dashboard.html';
    } catch(err) {
      console.error(err);
      showError(err);
    }
  });

  // ===== Phone login =====
  document.getElementById('phoneForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const phone = buildPhone();
    const pass  = document.getElementById('phonePass')?.value || '';
    if (!phone || !pass) { alert('Isi telepon dan sandi.'); return; }

    // Debug: tampilkan email mapping di console
    const mapped = (phone.startsWith('+') ? phone.slice(1) : phone) + '@phone.user';
    console.log('[Login/Phone] mapped email:', mapped);

    try {
      await fb.signInPhonePass(phone, pass);
      location.href = 'dashboard.html';
    } catch(err) {
      console.error(err);
      showError(err);
    }
  });
});
