// js/features/withdraw.js
// Tarik Saldo (E-Wallet & Bank) — sinkron dgn dashboard.html
// - Toggle tab Wallet/Bank
// - Submit ke Firestore (collection: withdrawals)
// - Tampilkan riwayat user di #wdList
// - Isi saldo ringkas pf-*

import {
  getFirestore,
  collection, addDoc, onSnapshot,
  query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const fmtRp = n => new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
}).format(Number(n || 0));

const toast = m => window.App?.toast ? window.App.toast(m) : alert(m);

export function initWithdraw() {
  const root = document.getElementById('withdrawTab');
  if (!root) return; // tab belum ada di halaman, skip

  // Jangan pasang listener dua kali
  if (root.dataset.bound === '1') return;
  root.dataset.bound = '1';

  // Elemen tab & form
  const tabWallet  = document.getElementById('wdTabWallet');
  const tabBank    = document.getElementById('wdTabBank');
  const formWallet = document.getElementById('wdFormWallet');
  const formBank   = document.getElementById('wdFormBank');

  // Info saldo
  const pfQuant       = root.querySelector('.pf-quant');
  const pfTotal       = root.querySelector('.pf-total');
  const pfTotalApprox = root.querySelector('.pf-total-approx');

  // Toggle tab
  function activate(which) {
    const isWallet = which === 'wallet';
    tabWallet?.classList.toggle('tab-active', isWallet);
    tabBank?.classList.toggle('tab-active', !isWallet);
    formWallet?.classList.toggle('hidden', !isWallet);
    formBank?.classList.toggle('hidden', isWallet);
  }
  tabWallet?.addEventListener('click', () => activate('wallet'));
  tabBank?.addEventListener('click',   () => activate('bank'));
  activate('wallet'); // default

  // Firestore/Auth
  const auth = window.App?.firebase?.auth;
  const db   = window.App?.firebase?.db || getFirestore();

  // Sinkron saldo ringkas dari user doc (kalau hook tersedia)
  try {
    const onUserDoc = window.App?.firebase?.onUserDoc;
    const user = auth?.currentUser;
    if (user && typeof onUserDoc === 'function') {
      onUserDoc(user.uid, snap => {
        if (!snap.exists()) return;
        const d = snap.data() || {};
        const balance = Number(d.balance || 0);
        if (pfQuant)       pfQuant.textContent       = balance.toFixed(2);
        if (pfTotal)       pfTotal.textContent       = fmtRp(balance);
        if (pfTotalApprox) pfTotalApprox.textContent = '≈ ' + fmtRp(balance);
      });
    }
  } catch (e) { console.warn('onUserDoc hook not available:', e); }

  // Submit: E-WALLET
  formWallet?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth?.currentUser;
    if (!user) return toast('Silakan login terlebih dahulu.');

    const provider = (root.querySelector('input[name="wallet"]:checked')?.value || '').trim();
    const number   = (document.getElementById('wdwNumber')?.value || '').trim();
    const name     = (document.getElementById('wdwName')?.value || '').trim();
    const amount   = Number(document.getElementById('wdwAmount')?.value || 0);

    if (!provider)               return toast('Pilih e-wallet dahulu.');
    if (!number || !name)        return toast('Lengkapi nomor & nama pemilik.');
    if (!Number.isFinite(amount) || amount < 10000) return toast('Minimal penarikan Rp 10.000.');

    try {
      await addDoc(collection(db, 'withdrawals'), {
        uid: auth.currentUser.uid,
        type: 'ewallet', provider, number, name, amount,
        status: 'pending', createdAt: serverTimestamp()
      });
      toast('Permintaan tarik saldo dikirim. Menunggu persetujuan admin.');
      e.target.reset();
      const first = root.querySelector('input[name="wallet"]'); if (first) first.checked = true;
    } catch (err) { console.error(err); toast('Gagal mengirim permintaan. Coba lagi.'); }
  });

  // Submit: BANK
  formBank?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth?.currentUser;
    if (!user) return toast('Silakan login terlebih dahulu.');

    const bank   = (root.querySelector('input[name="bank"]:checked')?.value || '').trim();
    const acc    = (document.getElementById('wdbRek')?.value || '').trim();
    const owner  = (document.getElementById('wdbName')?.value || '').trim();
    const amount = Number(document.getElementById('wdbAmount')?.value || 0);

    if (!bank)                  return toast('Pilih bank dahulu.');
    if (!acc || !owner)         return toast('Lengkapi no. rekening & nama pemilik.');
    if (!Number.isFinite(amount) || amount < 10000) return toast('Minimal penarikan Rp 10.000.');

    try {
      await addDoc(collection(db, 'withdrawals'), {
        uid: auth.currentUser.uid,
        type: 'bank', bank, account: acc, owner, amount,
        status: 'pending', createdAt: serverTimestamp()
      });
      toast('Permintaan tarik saldo dikirim. Menunggu persetujuan admin.');
      e.target.reset();
      const first = root.querySelector('input[name="bank"]'); if (first) first.checked = true;
    } catch (err) { console.error(err); toast('Gagal mengirim permintaan. Coba lagi.'); }
  });

  // Riwayat penarikan user (realtime)
  const list = document.getElementById('wdList');
  const user = auth?.currentUser;
  if (list && user) {
    try {
      const q = query(
        collection(db, 'withdrawals'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      onSnapshot(q, snap => {
        if (snap.empty) { list.innerHTML = '<li class="text-slate-400">Belum ada penarikan.</li>'; return; }
        const rows = [];
        snap.forEach(doc => {
          const d = doc.data() || {};
          const ts = d.createdAt?.toDate ? d.createdAt.toDate() : null;
          const tstr = ts ? ts.toLocaleString('id-ID') : '-';
          const tujuan = d.type === 'ewallet'
            ? `${d.provider || '-'} • ${d.number || '-'}`
            : `${d.bank || '-'} • ${d.account || '-'}`;
          rows.push(`
            <li class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold">${fmtRp(d.amount || 0)}</div>
                <div class="text-xs text-slate-400">${tujuan}</div>
              </div>
              <div class="text-right">
                <div class="text-xs px-2 py-0.5 rounded-full ${
                  d.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300'
                  : d.status === 'rejected' ? 'bg-rose-500/20 text-rose-300'
                  : 'bg-amber-500/20 text-amber-300'
                }">${(d.status || 'pending').toUpperCase()}</div>
                <div class="text-[11px] text-slate-400 mt-0.5">${tstr}</div>
              </div>
            </li>
          `);
        });
        list.innerHTML = rows.join('');
      });
    } catch (e) { console.error('wd history error', e); }
  }
}
