// js/features/auth-phone.js
(() => {
  const MODE  = (window.AUTH_MODE || 'login').toLowerCase();
  const isReg = MODE === 'register';

  const { signInPhonePass, signUpPhonePass, ensureUserDoc } = (window.App?.firebase || {});
  const form  = document.getElementById('phoneForm');
  if (!form || !signInPhonePass || !signUpPhonePass) return;

  const cc    = document.getElementById('ccSelect');           // select kode negara (mis. +62)
  const phone = document.getElementById('phoneInput');         // input nomor
  const pass  = document.getElementById('phonePassInput');     // input password
  const pass2 = document.getElementById('phonePassConfirm');   // konfirmasi (hanya register)

  // bantu: normalisasi gabungan cc + nomor -> +62xxxxxxxx
  function buildFullPhone() {
    const ccVal   = (cc?.value || '+62').trim();
    const numOnly = String(phone?.value || '').replace(/\D/g, ''); // hanya digit
    let full = (ccVal.startsWith('+') ? ccVal : ('+' + ccVal)) + numOnly;
    // rapikan dobel plus misal input aneh
    full = '+' + full.replace(/^\++/, '');
    return full;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phoneFull = buildFullPhone();
    const pwd  = (pass?.value  || '').trim();
    const pwd2 = (pass2?.value || '').trim();

    if (phoneFull.length < 8 || !pwd) {
      return toast('Nomor/sandi tidak valid.');
    }
    if (isReg && pwd !== pwd2) {
      return toast('Kata sandi tidak sama.');
    }

    try {
      if (isReg) {
        const cred = await signUpPhonePass(phoneFull, pwd);
        try { await ensureUserDoc(cred.user.uid); } catch {}
        toast('Pendaftaran berhasil. Memuat akun…');
      } else {
        await signInPhonePass(phoneFull, pwd);
        toast('Login berhasil. Memuat dashboard…');
      }

      // ❌ jangan redirect manual ke dashboard.html
      // ✅ biarkan onAuthStateChanged di app-core.js/halaman yang handle UI
    } catch (err) {
      console.error(err);
      toast(err?.message || 'Gagal memproses telepon.');
    }
  });

  function toast(m){ window.App?.toast ? window.App.toast(m) : alert(m); }
})();
