(function(){
  const { $, show, hide, toast, firebase } = window.App;

  // Register Email
  const reForm = $('#form-reg-email');
  if (reForm){
    const email = $('#reg-email'), pass = $('#reg-pass'), alert = $('#reg-email-alert'), btn = $('#btn-reg-email');
    reForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); hide(alert); btn.disabled=true;
      try{
        const cred = await firebase.signUpEmail((email.value||'').trim(), pass.value);
        toast('Akun email dibuat: ' + (cred.user.email||'')); 
        window.location.href = 'index.html';
      }catch(err){
        alert.textContent = pretty(err?.message||''); show(alert);
      }finally{ btn.disabled=false; }
    });
  }

  // Register Phone
  const rpForm = $('#form-reg-phone');
  if (rpForm){
    const phone = $('#reg-phone'), pass = $('#reg-phone-pass'), alert = $('#reg-phone-alert'), btn = $('#btn-reg-phone');
    rpForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); hide(alert); btn.disabled=true;
      try{
        const cred = await firebase.signUpPhonePass((phone.value||'').trim(), pass.value);
        toast('Akun telepon dibuat: ' + (cred.user.displayName || ''));
        window.location.href = 'index.html';
      }catch(err){
        alert.textContent = pretty(err?.message||''); show(alert);
      }finally{ btn.disabled=false; }
    });
  }

  function pretty(msg){
    if (msg.includes('auth/email-already-in-use')) return 'Akun sudah terdaftar.';
    if (msg.includes('auth/weak-password')) return 'Kata sandi terlalu lemah (min. 6 karakter).';
    if (msg.includes('auth/invalid-email')) return 'Format email/telepon tidak valid.';
    return 'Gagal: ' + msg.replace('Firebase: ','');
  }
})();
