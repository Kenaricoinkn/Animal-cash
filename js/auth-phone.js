// js/features/auth-phone.js
(() => {
  const MODE = (window.AUTH_MODE || 'login').toLowerCase();
  const isReg = MODE === 'register';

  const { signInPhonePass, signUpPhonePass, ensureUserDoc } = window.App.firebase;
  const form = document.getElementById('phoneForm');
  if (!form) return;

  const cc     = document.getElementById('ccSelect');
  const phone  = document.getElementById('phoneInput');
  const pass   = document.getElementById('phonePassInput');
  const pass2  = document.getElementById('phonePassConfirm');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phoneFull = `${cc.value || '+62'}${(phone.value || '').replace(/\D/g,'')}`;
    const pwd = (pass.value || '').trim();
    const pwd2 = (pass2?.value || '').trim();

    if (phoneFull.length < 7 || !pwd) return toast('Nomor/sandi tidak valid.');
    if (isReg && pwd !== pwd2) return toast('Kata sandi tidak sama.');

    try {
      let cred;
      if (isReg) {
        cred = await signUpPhonePass(phoneFull, pwd);
        try { await ensureUserDoc(cred.user.uid); } catch {}
      } else {
        cred = await signInPhonePass(phoneFull, pwd);
      }
      location.href = 'dashboard.html';
    } catch (err) {
      console.error(err);
      toast(err.message || 'Gagal memproses telepon.');
    }
  });

  function toast(m){ window.App?.toast ? window.App.toast(m) : alert(m); }
})();
