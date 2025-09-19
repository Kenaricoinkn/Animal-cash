// js/features/farm.js

// Helper ringkas
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Formatter Rupiah
const fmtRp = (n, opt = {}) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0, ...opt }).format(Number(n || 0));

/* =========================================================================
 *  PUBLIC API
 * ========================================================================= */

// Dipanggil dari dashboard.js setelah Firebase siap
export function initFarm() {
  const farmTab = $('#farmTab');
  if (!farmTab || !window.App?.firebase) return;

  const { auth, ensureUserDoc, onUserDoc } = window.App.firebase;
  const user = auth.currentUser;
  if (!user) return;

  // Pastikan dokumen user ada, lalu dengarkan realtime
  ensureUserDoc(user.uid)
    .then(() => {
      onUserDoc(user.uid, snap => {
        if (!snap.exists()) return;
        const data = snap.data() || {};
        renderFarm(data);
      });
    })
    .catch(e => {
      console.error('ensureUserDoc error', e);
      toast('Gagal memuat Farm');
    });

  // Tombol "Catatan transaksi"
  farmTab.querySelector('.farm-footer .chip.strong')
    ?.addEventListener('click', () => toast('Belum ada transaksi'));

  // Inisialisasi kartu hewan layout v2 (marketplace)
  initFarmCards();
}

// Setter manual bila ingin update dari tempat lain
export function setFarmStats(payload = {}) {
  renderFarm(payload);
}

// Inisialisasi kartu hewan (layout baru v2)
export function initFarmCards() {
  const cards = $$('.animal-card.v2', $('#farmTab'));
  if (!cards.length) return;

  cards.forEach(card => {
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);
    const total    = daily * contract;

    // Isi UI
    card.querySelector('.ac-price')?.replaceChildren(document.createTextNode(fmtRp(price)));
    card.querySelector('.ac-daily')?.replaceChildren(document.createTextNode(fmtRp(daily)));
    card.querySelector('.ac-total')?.replaceChildren(document.createTextNode(fmtRp(total)));
    const cycleEl = card.querySelector('.ac-cycle');
    if (cycleEl) cycleEl.textContent = `${contract} hari`;

    // Aksi beli
    card.querySelector('.buy-btn')?.addEventListener('click', () => {
      const name = (card.dataset.animal || card.querySelector('.ac-title')?.textContent || 'Item').toUpperCase();
      // TODO: ganti alert ini dengan flow checkout milikmu
      toast(`Beli ${name} seharga ${fmtRp(price)} ✅`);
    }, { once: false });
  });
}

/* =========================================================================
 *  PRIVATE: Render header saldo + metrics (kartu di atas marketplace)
 * ========================================================================= */

function renderFarm({
  balance = 0,
  profitAsset = 0,
  earningToday = 0,
  totalIncome = 0,
  countableDays = 210,
  countdownDays = 210
} = {}) {
  const root = $('#farmTab');
  if (!root) return;

  // Header saldo
  const balanceEl = root.querySelector('.farm-balance');
  if (balanceEl) balanceEl.textContent = Number(balance).toFixed(2);

  // Urutan sesuai markup:
  // 0: Aset Keuntungan, 1: Penghasilan Hari Ini, 2: Total Pendapatan,
  // 3: Jumlah Hari yang Dapat Dihitung, 4: Hari Hitung Mundur
  const values = [
    Number(profitAsset).toFixed(2),
    String(earningToday),
    Number(totalIncome).toFixed(2),
    String(countableDays),
    String(countdownDays)
  ];

  $$('.metric', root).forEach((m, i) => {
    const v = m.querySelector('.metric-value');
    if (v && values[i] != null) v.textContent = values[i];
  });
}

/* =========================================================================
 *  Utils
 * ========================================================================= */

function toast(msg) {
  if (window.App?.toast) window.App.toast(msg);
  else alert(msg);
}
