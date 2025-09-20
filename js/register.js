// js/register.js
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
    if (code.includes('email-already-in-use')) {
      alert('Nomor sudah terdaftar, silakan masuk.');
    } else {
      alert(err?.message || 'Gagal proses.');
    }
  };

  // ===== Email register =====
  document.getElementById('emailForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('email')?.value?.trim() || '';
    const pass  = document.getElementById('password')?.value || '';
    const pass2 = document.getElementById('password2')?.value || '';
    if (!email || !pass) { alert('Isi email dan sandi.'); return; }
    if (pass !== pass2) { alert('Ulangi sandi harus sama.'); return; }
    try {
      const uc = await fb.signUpEmail(email, pass);
      await fb.ensureUserDoc(uc.user.uid, {});
      location.href = 'dashboard.html';
    } catch(err) {
      console.error(err);
      showError(err);
    }
  });

  // ===== Phone register =====
  document.getElementById('phoneForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const phone = buildPhone();
    const pass  = document.getElementById('phonePass')?.value || '';
    const pass2 = document.getElementById('phonePass2')?.value || '';
    if (!phone || !pass) { alert('Isi telepon dan sandi.'); return; }
    if (pass !== pass2) { alert('Ulangi sandi harus sama.'); return; }
    try {
      const uc = await fb.signUpPhonePass(phone, pass);
      await fb.ensureUserDoc(uc.user.uid, {});
      location.href = 'dashboard.html';
    } catch(err) {
      console.error(err);
      showError(err);
    }
  });
});
