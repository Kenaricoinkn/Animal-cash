if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', initLogin, { once: true });
} else {
  initLogin();
}

function initLogin() {
  (function(){
    const { $, show, hide, toast, firebase } = window.App;

    // ====== Tab switch ======
    const tabLE=$('#tab-log-email'), tabLP=$('#tab-log-phone');
    const formLE=$('#form-log-email'), formLP=$('#form-log-phone');
    if(tabLE && tabLP){
      tabLE.onclick=()=>{ [tabLE,tabLP].forEach(b=>b.classList.remove('tab-active')); tabLE.classList.add('tab-active'); hide(formLP); show(formLE); };
      tabLP.onclick=()=>{ [tabLE,tabLP].forEach(b=>b.classList.remove('tab-active')); tabLP.classList.add('tab-active'); hide(formLE); show(formLP); };
    }

    // ====== Toggle eyes ======
    const toggle = (btnSel, inputSel) => {
      const btn = $(btnSel), input = $(inputSel);
      btn?.addEventListener('click', ()=>{ input.type = input.type === 'password' ? 'text' : 'password'; });
    };
    toggle('#toggleLogPwd', '#log-pass');
    toggle('#toggleLogPhonePwd', '#log-phone-pass');

    // ====== Login Email ======
    const leForm = $('#form-log-email');
    if (leForm){
      const email = $('#log-email'), pass = $('#log-pass'), alert = $('#log-email-alert'), btn = $('#btn-log-email');
      leForm.addEventListener('submit', async (e)=>{
        e.preventDefault(); hide(alert); btn.disabled=true;
        try{
          const em = (email.value||'').trim();
          const pw = (pass.value||'').trim();
          if(!em || !pw) throw new Error('Email & sandi wajib diisi.');
          await firebase.loginEmail(em, pw);
          toast('Login berhasil'); window.location.href='dashboard.html';
        }catch(err){ alert.textContent = prettify(err?.message||''); show(alert); }
        finally{ btn.disabled=false; }
      });
    }

    // ====== Login Phone ======
    const lpForm = $('#form-log-phone');
    if (lpForm){
      const cc   = $('#cc');
      const phone= $('#log-phone');
      const pass = $('#log-phone-pass');
      const alert= $('#log-phone-alert');
      const btn  = $('#btn-log-phone');

      lpForm.addEventListener('submit', async (e)=>{
        e.preventDefault(); hide(alert); btn.disabled=true;
        try{
          const code = (cc.value||'+62').replace('+','');
          const numRaw = (phone.value||'').replace(/[^\d]/g,'');
          if(!numRaw) throw new Error('Nomor telepon wajib diisi.');
          const full = `+${code}${numRaw}`;
          const pw   = (pass.value||'').trim();
          if(pw.length < 6) throw new Error('Kata sandi minimal 6 karakter.');

          await firebase.loginPhonePass(full, pw);
          toast('Login berhasil'); window.location.href='dashboard.html';
        }catch(err){
          alert.textContent = prettify(err?.message||''); show(alert);
        }finally{ btn.disabled=false; }
      });
    }

    function prettify(msg){
      if (msg.includes('auth/invalid-credential')) return 'Email/Telepon atau sandi salah.';
      if (msg.includes('invalid') || msg.includes('valid')) return 'Input tidak valid.';
      return 'Gagal: ' + msg.replace('Firebase: ','');
    }
  })();
}
