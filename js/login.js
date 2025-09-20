// js/login.js
document.addEventListener('DOMContentLoaded', () => {
  const F = window.App?.firebase;
  if (!F) return;

  // ---- EMAIL LOGIN ----
  const emailForm = document.getElementById('emailForm');
  emailForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = (document.getElementById('emailInput')?.value || '').trim();
    const pass  = document.getElementById('emailPass')?.value || '';
    if (!email || !pass) return alert('Isi email dan sandi.');
    try{
      await F.signInEmail(email, pass);
      location.href = 'dashboard.html';
    }catch(err){
      console.error(err);
      alert(err.message || 'Gagal masuk email.');
    }
  });

  // ---- PHONE LOGIN ----
  const phoneForm = document.getElementById('phoneForm');
  phoneForm?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const phone = (document.getElementById('phoneInput')?.value || '').trim();
    const pass  = document.getElementById('phonePass')?.value || '';
    if (!phone || !pass) return alert('Isi telepon dan sandi.');
    try{
      await F.signInPhonePass(phone, pass);
      location.href = 'dashboard.html';
    }catch(err){
      console.error(err);
      alert(err.message || 'Gagal masuk telepon.');
    }
  });
});
