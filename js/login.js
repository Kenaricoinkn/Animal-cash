// js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const fb = window.App?.firebase;
  if (!fb) return;

  // ===== Helper =====
  const onlyDigits = s => (s || '').replace(/[^\d]/g,'');
  const buildPhone = () => {
    const cc  = document.getElementById('country')?.value || '';
    const ph  = onlyDigits(document.getElementById('phone')?.value || '');
    if (!cc || !ph) return '';
    const ccDigits = onlyDigits(cc);
    return `+${ccDigits}${ph}`;
  };

  // ===== Email login =====
  document.getElementById('emailForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = document.getElementById('email')?.value?.trim() || '';
    const pass  = document.getElementById('password')?.value || '';
    if (!email || !pass) { alert('Isi email dan sandi.'); return; }
    try{
      await fb.signInEmail(email, pass);
      location.href = 'dashboard.html';
    }catch(err){
      console.error(err);
      alert(err?.message || 'Gagal masuk dengan email.');
    }
  });

  // ===== Phone login (phone@domain mapping, tanpa OTP) =====
  document.getElementById('phoneForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const phone = buildPhone();
    const pass  = document.getElementById('phonePass')?.value || '';
    if (!phone || !pass) { alert('Isi telepon dan sandi.'); return; }
    try{
      await fb.signInPhonePass(phone, pass);
      location.href = 'dashboard.html';
    }catch(err){
      console.error(err);
      alert(err?.message || 'Gagal masuk dengan telepon.');
    }
  });
});
