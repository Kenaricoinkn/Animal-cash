// js/features/withdraw.js
// Gunakan instance Firebase yang sudah dibuat di firebase-init.js (window.App.firebase)
// dan kirim request penarikan ke koleksi 'withdrawals'

(() => {
  document.addEventListener('DOMContentLoaded', () => {
    const tabWallet  = document.getElementById('wdTabWallet');
    const tabBank    = document.getElementById('wdTabBank');
    const formWallet = document.getElementById('formWallet');
    const formBank   = document.getElementById('formBank');

    if (!tabWallet || !tabBank || !formWallet || !formBank) return;

    const toast = (m) => (window.App?.toast ? window.App.toast(m) : alert(m));
    const auth  = window.App?.firebase?.auth;
    const db    = window.App?.firebase?.db;
    const { collection, addDoc, serverTimestamp } = window.App?.firebase || {};

    // ---------- Tabs Wallet/Bank ----------
    function activate(which) {
      const isWallet = which === 'wallet';
      tabWallet.classList.toggle('tab-active', isWallet);
      tabBank.classList.toggle('tab-active', !isWallet);
      formWallet.classList.toggle('hidden', !isWallet);
      formBank.classList.toggle('hidden', isWallet);
    }
    tabWallet.addEventListener('click', () => activate('wallet'));
    tabBank.addEventListener('click', () => activate('bank'));
    activate('wallet');

    // ---------- Submit: E-Wallet ----------
    formWallet.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth?.currentUser;
      if (!user) return toast('Silakan login ulang.');

      const provider = (document.getElementById('walletProvider')?.value || '').trim();
      const number   = (document.getElementById('walletNumber')?.value || '').trim();
      const name     = (document.getElementById('walletName')?.value || '').trim();
      const amount   = Number(document.getElementById('walletAmount')?.value || 0);

      if (!provider || !number || !name || !amount || amount < 10000) {
        return toast('Lengkapi data. Minimal penarikan Rp10.000.');
      }

      try {
        await addDoc(collection(db, 'withdrawals'), {
          uid: user.uid,
          type: 'ewallet',
          provider, number, name,
          amount,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        toast('Permintaan tarik saldo dikirim. Menunggu persetujuan admin.');
        e.target.reset();
      } catch (err) {
        console.error('withdraw ewallet error', err);
        toast('Gagal mengirim permintaan. Coba lagi.');
      }
    });

    // ---------- Submit: Bank ----------
    formBank.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = auth?.currentUser;
      if (!user) return toast('Silakan login ulang.');

      const bank   = (document.getElementById('bankName')?.value || '').trim();
      const acc    = (document.getElementById('bankNumber')?.value || '').trim();
      const owner  = (document.getElementById('bankOwner')?.value || '').trim();
      const amount = Number(document.getElementById('bankAmount')?.value || 0);

      if (!bank || !acc || !owner || !amount || amount < 10000) {
        return toast('Lengkapi data. Minimal penarikan Rp10.000.');
      }

      try {
        await addDoc(collection(db, 'withdrawals'), {
          uid: user.uid,
          type: 'bank',
          bank, account: acc, owner,
          amount,
          status: 'pending',
          createdAt: serverTimestamp()
        });
        toast('Permintaan tarik saldo dikirim. Menunggu persetujuan admin.');
        e.target.reset();
      } catch (err) {
        console.error('withdraw bank error', err);
        toast('Gagal mengirim permintaan. Coba lagi.');
      }
    });
  });
})();
