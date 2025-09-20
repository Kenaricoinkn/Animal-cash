// js/features/auth-email.js
(() => {
  const MODE = (window.AUTH_MODE || 'login').toLowerCase();
  const isReg = MODE === 'register';

  const { signInEmail, signUpEmail, ensureUserDoc, auth } = window.App.firebase;
  const form   = document.getElementById('emailForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = (document.getElementById('emailInput')?.value || '').trim();
    const pass  = (document.getElementById('passInput')?.value  || '').trim();
    const pass2 = (document.getElementById('passConfirmInput')?.value || '').trim();

    if (!email || !pass) return toast('Lengkapi email dan kata sandi.');
    if (isReg && pass !== pass2) return toast('Kata sandi tidak sama.');

    try {
      let cred;
      if (isReg) {
        cred = await signUpEmail(email, pass);
        try { await ensureUserDoc(cred.user.uid); } catch {}
      } else {
        cred = await signInEmail(email, pass);
      }
      location.href = 'dashboard.html';
    } catch (err) {
      console.error(err);
      toast(err.message || 'Gagal memproses email.');
    }
  });

  function toast(m){ window.App?.toast ? window.App.toast(m) : alert(m); }
})();
