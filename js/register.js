// js/register.js
document.addEventListener('DOMContentLoaded', () => {
  const F = window.App?.firebase;
  if (!F) return;

  // ---- EMAIL REGISTER ----
  document.getElementById('emailForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const email = (document.getElementById('emailInput')?.value || '').trim();
    const pass  = document.getElementById('emailPass')?.value || '';
    const pass2 = document.getElementById('emailPass2')?.value || '';
    if (!email || !pass) return alert('Isi email & sandi.');
    if (pass !== pass2)  return alert('Ulangi sandi tidak sama.');
    try{
      const uc = await F.signUpEmail(email, pass);
      await F.ensureUserDoc(uc.user.uid);
      location.href = 'dashboard.html';
    }catch(err){
      console.error(err);
      alert(err.message || 'Gagal daftar email.');
    }
  });

  // ---- PHONE REGISTER ----
  document.getElementById('phoneForm')?.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const phone = (document.getElementById('phoneInput')?.value || '').trim();
    const pass  = document.getElementById('phonePass')?.value || '';
    const pass2 = document.getElementById('phonePass2')?.value || '';
    if (!phone || !pass) return alert('Isi telepon & sandi.');
    if (pass !== pass2)  return alert('Ulangi sandi tidak sama.');
    try{
      const uc = await F.signUpPhonePass(phone, pass);
      await F.ensureUserDoc(uc.user.uid);
      location.href = 'dashboard.html';
    }catch(err){
      console.error(err);
      alert(err.message || 'Gagal daftar telepon.');
    }
  });
});
