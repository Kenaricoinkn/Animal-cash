// js/features/farm.js
function $(sel, root = document) { return root.querySelector(sel); }

export function initFarm() {
  const farmTab = $('#farmTab');
  if (!farmTab || !window.App?.firebase) return;

  const { auth, ensureUserDoc, onUserDoc } = window.App.firebase;

  // Saat user sudah login (dipanggil dari dashboard.js setelah auth siap)
  const user = auth.currentUser;
  if (!user) return;

  // Pastikan dokumen user ada
  ensureUserDoc(user.uid).then(()=>{
    // Dengarkan perubahan realtime
    onUserDoc(user.uid, (snap)=>{
      if (!snap.exists()) return;
      const data = snap.data() || {};
      renderFarm(data);
    });
  }).catch((e)=>{
    console.error('ensureUserDoc error', e);
    toast('Gagal memuat Farm');
  });

  // contoh aksi tombol catatan transaksi
  const txBtn = farmTab.querySelector('.farm-footer .chip.strong');
  txBtn?.addEventListener('click', () => {
    window.App?.toast ? window.App.toast('Belum ada transaksi') : alert('Belum ada transaksi');
  });
}

// Render ke DOM sesuai struktur di dashboard.html
function renderFarm({
  balance=0, profitAsset=0, earningToday=0, totalIncome=0, countableDays=210, countdownDays=210
} = {}){
  const root = $('#farmTab');
  if (!root) return;

  const fmt = (n) => (typeof n === 'number') ? n.toFixed(2) : n;

  // Header saldo
  const balanceEl = root.querySelector('.farm-balance');
  if (balanceEl) balanceEl.textContent = fmt(Number(balance));

  // Urutan sesuai markup:
  // 0: Aset Keuntungan, 1: Penghasilan Hari Ini, 2: Total Pendapatan,
  // 3: Jumlah Hari yang Dapat Dihitung, 4: Hari Hitung Mundur
  const values = [
    fmt(Number(profitAsset)),
    String(earningToday),
    fmt(Number(totalIncome)),
    String(countableDays),
    String(countdownDays)
  ];

  [...root.querySelectorAll('.metric')].forEach((m, i) => {
    const v = m.querySelector('.metric-value');
    if (v && values[i] != null) v.textContent = values[i];
  });
}

// Optional: update manual dari tempat lain
export function setFarmStats(payload={}){
  renderFarm(payload);
}

// kecil: toast helper lokal
function toast(msg){
  if (window.App?.toast) window.App.toast(msg);
  else alert(msg);
}
