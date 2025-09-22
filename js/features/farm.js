// js/features/farm.js

// Helper ringkas
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Formatter Rupiah
const fmtRp = (n, opt = {}) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    ...opt
  }).format(Number(n || 0));

/* =========================================================================
 *  PUBLIC API
 * ========================================================================= */

export function initFarm() {
  const farmTab = $('#farmTab');
  if (!farmTab || !window.App?.firebase) return;

  const { auth, ensureUserDoc, onUserDoc } = window.App.firebase;
  const user = auth.currentUser;
  if (!user) return;

  // Pastikan dokumen user ada, lalu realtime listen
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

  // Inisialisasi kartu hewan (marketplace)
  initFarmCards();

  // Tombol "Catatan transaksi" (bisa ada di Farm atau Profil)
  $$('.chip.strong').forEach(btn => {
    btn.addEventListener('click', () => toast('Belum ada transaksi'));
  });
}

// Setter manual bila ingin update dari tempat lain
export function setFarmStats(payload = {}) {
  renderFarm(payload);
}

// Inisialisasi kartu hewan (layout marketplace)
export function initFarmCards() {
  const cards = $$('#marketList .market-card, .animal-card.v2', document);
  if (!cards.length) return;

  cards.forEach(card => {
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);
    const total    = daily * contract;

    // Isi UI (coba cari selector versi v2 atau market)
    const priceEl = card.querySelector('.ac-price, .mc-price b');
    if (priceEl) priceEl.textContent = fmtRp(price);

    const dailyEl = card.querySelector('.ac-daily, .mc-stat .mc-big');
    if (card.classList.contains('market-card')) {
      const d = card.querySelectorAll('.mc-stat .mc-big')[0];
      const t = card.querySelectorAll('.mc-stat .mc-big')[1];
      if (d) d.textContent = fmtRp(daily);
      if (t) t.textContent = fmtRp(total);
      const c = card.querySelector('.mc-contract, .mc-stat .mc-big:nth-child(3)');
      if (c) c.textContent = `${contract} hari`;
    } else {
      if (dailyEl) dailyEl.textContent = fmtRp(daily);
      const totalEl = card.querySelector('.ac-total');
      if (totalEl) totalEl.textContent = fmtRp(total);
      const cycleEl = card.querySelector('.ac-cycle');
      if (cycleEl) cycleEl.textContent = `${contract} hari`;
    }

    card.querySelector('.buy-btn, .buy-btn-green')?.addEventListener('click', () => {
      const name = (card.dataset.animal || card.querySelector('.ac-title, .mc-title')?.textContent || 'Item').toUpperCase();
      toast(`Beli ${name} seharga ${fmtRp(price)} ✅`);
    }, { once: false });
  });
}

/* =========================================================================
 *  PRIVATE: Render saldo + metrik (update ke Farm & Profil sekaligus)
 * ========================================================================= */

function renderFarm({
  balance = 0,
  profitAsset = 0,
  earningToday = 0,
  totalIncome = 0,
  countableDays = 210,
  countdownDays = 210
} = {}) {
  // Update semua saldo kuantitatif (baik di Farm maupun di Profil)
  $$('.farm-balance').forEach(el => {
    el.textContent = Number(balance).toFixed(2);
  });

  // Data metrik (urutannya mengikuti markup)
  const values = [
    Number(profitAsset).toFixed(2), // Aset Keuntungan
    String(earningToday),           // Penghasilan Hari Ini
    Number(totalIncome).toFixed(2), // Total Pendapatan
    String(countableDays),          // Jumlah Hari yang Dapat Dihitung
    String(countdownDays)           // Hari Hitung Mundur
  ];

  // Untuk setiap grid metrik yang ada di halaman, isi sesuai urutan
  $$('.metric-grid').forEach(grid => {
    $$('.metric', grid).forEach((m, i) => {
      const v = m.querySelector('.metric-value');
      if (v && values[i] != null) v.textContent = values[i];
    });
  });
}

/* =========================================================================
 *  Utils
 * ========================================================================= */

function toast(msg) {
  if (window.App?.toast) window.App.toast(msg);
  else alert(msg);
}
