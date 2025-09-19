// js/features/farm.js
// Modul UI & logic ringan untuk tab Farm (tanpa API dulu)

function $(sel, root = document) { return root.querySelector(sel); }

export function initFarm() {
  // Aman kalau elemen belum ada
  const farmTab = $('#farmTab');
  if (!farmTab) return;

  // Contoh: aksi tombol catatan transaksi
  const txBtn = farmTab.querySelector('.farm-footer .chip.strong');
  txBtn?.addEventListener('click', () => {
    window.App?.toast ? window.App.toast('Belum ada transaksi') : alert('Belum ada transaksi');
  });
}

/** Optional helper: update angka-angka farm */
export function setFarmStats({
  balance = '0.00',
  profitAsset = '0.00',
  earningToday = '0',
  totalIncome = '0.00',
  countableDays = '210',
  countdownDays = '210',
} = {}) {
  const farm = document.querySelector('#farmTab');
  if (!farm) return;

  // Header saldo
  const balanceEl = farm.querySelector('.farm-balance');
  if (balanceEl) balanceEl.textContent = balance;

  // Metrik
  const metrics = [...farm.querySelectorAll('.metric')];
  // Urutan sesuai markup kamu:
  // 0: Aset Keuntungan, 1: Penghasilan Hari Ini, 2: Total Pendapatan,
  // 3: Jumlah Hari yang Dapat Dihitung, 4: Hari Hitung Mundur
  const values = [profitAsset, earningToday, totalIncome, countableDays, countdownDays];
  metrics.forEach((m, i) => {
    const v = m.querySelector('.metric-value');
    if (v && values[i] !== undefined) v.textContent = values[i];
  });
}
