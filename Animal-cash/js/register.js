if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', initRegister, { once: true });
} else {
  initRegister();
}

function initRegister() {
  // >>> Pindahkan seluruh isi register.js kamu ke dalam fungsi ini <<<
}
(function(){
  const { $, show, hide, toast, firebase } = window.App;

  // ====== Tab switch ======
  const tabRE=$('#tab-reg-email'), tabRP=$('#tab-reg-phone');
  const formRE=$('#form-reg-email'), formRP=$('#form-reg-phone');
  if(tabRE && tabRP){
    tabRE.onclick=()=>{ [tabRE,tabRP].forEach(b=>b.classList.remove('tab-active')); tabRE.classList.add('tab-active'); hide(formRP); show(formRE); };
    tabRP.onclick=()=>{ [tabRE,tabRP].forEach(b=>b.classList.remove('tab-active')); tabRP.classList.add('tab-active'); hide(formRE); show(formRP); };
  }

  // ====== Toggle eyes ======
  const toggle = (btnSel, inputSel) => {
    const btn = $(btnSel), input = $(inputSel);
    btn?.addEventListener('click', ()=>{ input.type = input.type === 'password' ? 'text' : 'password'; });
  };
  toggle('#toggleRegPwd', '#reg-pass');
  toggle('#toggleRegPhonePwd', '#reg-phone-pass');

  // ====== Register Email ======
  const reForm = $('#form-reg-email');
  if (reForm){
    const email = $('#reg-email'), pass = $('#reg-pass'), alert = $('#reg-email-alert'), btn = $('#btn-reg-email');
    reForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); hide(alert); btn.disabled=true;
      try{
        const em = (email.value||'').trim();
        const pw = (pass.value||'').trim();
        if(!em || !pw) throw new Error('Email & sandi wajib diisi.');
        const cred = await firebase.signUpEmail(em, pw);
        toast('Akun email dibuat'); window.location.href='index.html';
      }catch(err){ alert.textContent = prettify(err?.message||''); show(alert); }
      finally{ btn.disabled=false; }
    });
  }

  // ====== Register Phone (kode negara + nomor) ======
  const rpForm = $('#form-reg-phone');
  if (rpForm){
    const cc   = $('#cc');
    const phone= $('#reg-phone');
    const pass = $('#reg-phone-pass');
    const alert= $('#reg-phone-alert');
    const btn  = $('#btn-reg-phone');

    rpForm.addEventListener('submit', async (e)=>{
      e.preventDefault(); hide(alert); btn.disabled=true;
      try{
        const code = (cc.value||'+62').replace('+','');
        const numRaw = (phone.value||'').replace(/[^\d]/g,'');
        if(!numRaw) throw new Error('Nomor telepon wajib diisi.');
        const full = `+${code}${numRaw}`;
        const pw   = (pass.value||'').trim();
        if(pw.length < 6) throw new Error('Kata sandi minimal 6 karakter.');

        // create user mapped to email form: digits@phone.user
        await firebase.signUpPhonePass(full, pw);
        toast('Akun telepon dibuat'); window.location.href='index.html';
      }catch(err){
        alert.textContent = prettify(err?.message||''); show(alert);
      }finally{ btn.disabled=false; }
    });
  }

  function prettify(msg){
    if (msg.includes('auth/email-already-in-use')) return 'Akun sudah terdaftar.';
    if (msg.includes('auth/weak-password')) return 'Kata sandi terlalu lemah (min. 6).';
    if (msg.includes('invalid') || msg.includes('valid')) return 'Input tidak valid.';
    return 'Gagal: ' + msg.replace('Firebase: ','');
  }
})();
