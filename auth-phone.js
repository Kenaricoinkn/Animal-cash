// Phone OTP handlers
(function () {
  const { $, show, hide, toast, firebase } = window.App;

  const phoneInput = $('#phone');
  const otpInput   = $('#otp');
  const phoneAlert = $('#phone-alert');
  const btnSend    = $('#btn-send-otp');
  const btnVerify  = $('#btn-verify-otp');

  if (!phoneInput) return;

  btnSend.onclick = async () => {
    hide(phoneAlert);
    const phone = (phoneInput.value || '').trim();
    if (!phone.startsWith('+')) {
      phoneAlert.textContent = 'Nomor wajib format internasional, contoh: +62...';
      show(phoneAlert); return;
    }
    try {
      await firebase.sendOtp(phone);
      toast('Kode OTP terkirim via SMS');
    } catch (e) {
      phoneAlert.textContent = formatErr(e?.message || String(e));
      show(phoneAlert);
    }
  };

  btnVerify.onclick = async () => {
    hide(phoneAlert);
    try {
      const res = await firebase.verifyOtp((otpInput.value || '').trim());
      toast('Login telepon berhasil: ' + (res.user.phoneNumber || ''));
      // TODO: window.location.href = '/dashboard.html';
    } catch (e) {
      phoneAlert.textContent = 'Kode OTP salah atau kedaluwarsa.';
      show(phoneAlert);
    }
  };

  function formatErr(msg){
    if (msg.includes('auth/too-many-requests')) return 'Terlalu banyak percobaan, coba lagi nanti.';
    if (msg.includes('captcha')) return 'reCAPTCHA gagal. Pastikan domain sudah terdaftar di Firebase.';
    if (msg.includes('auth/invalid-phone-number')) return 'Nomor telepon tidak valid.';
    return 'Gagal mengirim OTP: ' + msg.replace('Firebase: ', '');
  }
})();
