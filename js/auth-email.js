// Email login form handlers (no module import needed)
(function () {
  const { $, show, hide, toast, firebase } = window.App;

  const emailInput = $('#email');
  const passInput  = $('#password');
  const emailAlert = $('#email-alert');
  const btnEmail   = $('#btn-email');
  const togglePwd  = $('#togglePwd');

  if (!emailInput) return; // safety

  togglePwd.onclick = () => {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
  };

  $('#form-email').addEventListener('submit', async (e) => {
    e.preventDefault();
    hide(emailAlert); btnEmail.disabled = true;

    try {
      const user = await firebase.signInEmail(emailInput.value.trim(), passInput.value);
      toast('Berhasil masuk: ' + (user.user.email || 'user'));
      // TODO: window.location.href = '/dashboard.html';
    } catch (err) {
      const msg = (err && err.message) || '';
      emailAlert.textContent = prettyFirebaseErr(msg);
      show(emailAlert);
    } finally {
      btnEmail.disabled = false;
    }
  });

  function prettyFirebaseErr(msg){
    if (msg.includes('auth/invalid-email')) return 'Email tidak valid.';
    if (msg.includes('auth/missing-password')) return 'Kata sandi wajib diisi.';
    if (msg.includes('auth/invalid-credential')) return 'Email atau kata sandi salah.';
    if (msg.includes('auth/user-not-found')) return 'Akun tidak ditemukan.';
    if (msg.includes('auth/too-many-requests')) return 'Terlalu banyak percobaan, coba lagi nanti.';
    if (msg.includes('auth/operation-not-allowed')) return 'Metode login belum diaktifkan di Firebase Console.';
    return 'Gagal masuk: ' + msg.replace('Firebase: ', '');
  }
})();
