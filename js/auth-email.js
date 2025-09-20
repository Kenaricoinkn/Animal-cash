(function () {
  const { $, show, hide, toast, firebase } = window.App;
  const emailInput = $('#email');
  if (!emailInput) return;

  const passInput  = $('#password');
  const emailAlert = $('#email-alert');
  const btnEmail   = $('#btn-email');

  $('#togglePwd').onclick = () => {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  };

  $('#form-email').addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(emailAlert); 
    btnEmail.disabled = true;

    try {
      const cred = await firebase.signInEmail(emailInput.value.trim(), passInput.value);
      toast('Masuk sebagai ' + (cred.user.email || 'user'));

      // ✅ setelah sukses login, arahkan ke dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 800);

    } catch (err) {
      emailAlert.textContent = pretty(err?.message || '');
      show(emailAlert);
    } finally { 
      btnEmail.disabled = false; 
    }
  });

  function pretty(msg){
    if (msg.includes('auth/invalid-email')) return 'Email tidak valid.';
    if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) return 'Email atau kata sandi salah.';
    if (msg.includes('auth/user-not-found')) return 'Akun tidak ditemukan.';
    if (msg.includes('auth/too-many-requests')) return 'Terlalu banyak percobaan. Coba lagi nanti.';
    return 'Gagal masuk: ' + msg.replace('Firebase: ','');
  }
})();

// ---- glue: expose to global for tab controller ----
if (typeof handleEmailLogin === 'function') { window.handleEmailLogin = handleEmailLogin; }
else if (typeof defaultExport === 'function') { window.handleEmailLogin = defaultExport; }
