// js/features/withdraw.js
import {
  getFirestore, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

(function () {
  document.addEventListener('DOMContentLoaded', () => {
    // Tab switch (Wallet/Bank)
    const tabWallet = document.getElementById('wdTabWallet');
    const tabBank   = document.getElementById('wdTabBank');
    const formWallet= document.getElementById('formWallet');
    const formBank  = document.getElementById('formBank');

    if (!tabWallet || !tabBank) return;

    function activate(which){
      const isWallet = which === 'wallet';
      tabWallet.classList.toggle('tab-active', isWallet);
      tabBank.classList.toggle('tab-active', !isWallet);
      formWallet.classList.toggle('hidden', !isWallet);
      formBank.classList.toggle('hidden', isWallet);
    }
    tabWallet.addEventListener('click', ()=>activate('wallet'));
    tabBank.addEventListener('click', ()=>activate('bank'));
    activate('wallet');

    // Submit helpers
    const toast = (m)=> window.App?.toast ? window.App.toast(m) : alert(m);
    const auth  = window.App?.firebase?.auth;
    const db    = getFirestore();

    // E-WALLET SUBMIT
    formWallet?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const user = auth?.currentUser;
      if (!user) return toast('Silakan login ulang.');

      const provider = document.getElementById('walletProvider').value;
      const amount   = Number(document.getElementById('walletAmount').value || 0);
      const number   = (document.getElementById('walletNumber').value || '').trim();
      const name     = (document.getElementById('walletName').value || '').trim();

      if (!number || !name || amount < 10000) return toast('Lengkapi data & minimal Rp10.000.');
      try{
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
      }catch(err){ console.error(err); toast('Gagal mengirim permintaan. Coba lagi.'); }
    });

    // BANK SUBMIT
    formBank?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const user = auth?.currentUser;
      if (!user) return toast('Silakan login ulang.');

      const bank   = document.getElementById('bankName').value;
      const amount = Number(document.getElementById('bankAmount').value || 0);
      const acc    = (document.getElementById('bankNumber').value || '').trim();
      const owner  = (document.getElementById('bankOwner').value || '').trim();

      if (!acc || !owner || amount < 10000) return toast('Lengkapi data & minimal Rp10.000.');
      try{
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
      }catch(err){ console.error(err); toast('Gagal mengirim permintaan. Coba lagi.'); }
    });
  });
})();
