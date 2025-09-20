(function(){
  const { $, show, hide, toast, firebase } = window.App;
  const phoneInput = $('#phone');
  if (!phoneInput) return;

  const passInput  = $('#phone-password');
  const phoneAlert = $('#phone-alert');
  const btnPhone   = $('#btn-phone');

  $('#togglePhonePwd').onclick = () => {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  };

  $('#form-phone').addEventListener('submit', async (e)=>{
    e.preventDefault();
    hide(phoneAlert); 
    btnPhone.disabled = true;

    try{
      const phone = (phoneInput.value||'').trim();
      const pass  = (passInput.value||'');

      if(!phone || !pass) throw new Error('Nomor telepon & kata sandi wajib diisi.');

      const cred = await firebase.signInPhonePass(phone, pass);
      toast('Masuk telepon: ' + (cred.user.displayName || phone));

      // ✅ setelah sukses login → arahkan ke dashboard
      setTimeout(()=>{
        window.location.href = 'dashboard.html';
      }, 800);

    }catch(err){
      phoneAlert.textContent = pretty(err?.message || '');
      show(phoneAlert);
    }finally{ 
      btnPhone.disabled=false; 
    }
  });

  function pretty(msg){
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) return 'Nomor atau kata sandi salah.';
    if (msg.includes('auth/user-not-found')) return 'Akun telepon belum terdaftar.';
    if (msg.includes('auth/too-many-requests')) return 'Terlalu banyak percobaan. Coba lagi nanti.';
    return 'Gagal masuk: ' + msg.replace('Firebase: ','');
  }
})();

// ---- glue: expose to global for tab controller ----
