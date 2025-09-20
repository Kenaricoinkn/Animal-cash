// js/features/farm.js

// ---------- Helpers ----------
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Format Rupiah
const fmtRp = (n, opt = {}) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    ...opt
  }).format(Number(n || 0));

/* =======================================================================
 *  DATA MARKET (bisa kamu ambil dari backend nanti)
 * ======================================================================= */
const MARKET_ITEMS = [
  // nama, gambar, price, daily, contract (hari)
  { animal: 'cow',     title: 'COW',     img: 'img/cow.png',     price: 160_000, daily: 17_000, contract: 90 },
  { animal: 'chicken', title: 'CHICKEN', img: 'img/chicken.png', price: 90_000,  daily: 6_000,  contract: 60 },
  { animal: 'sheep',   title: 'SHEEP',   img: 'img/sheep.png',   price: 250_000, daily: 11_000, contract: 75 },
];

/* =======================================================================
 *  PUBLIC API
 * ======================================================================= */

// Dipanggil dari dashboard.js
export function initFarm() {
  const farmTab = $('#farmTab');
  if (!farmTab || !window.App?.firebase) return;

  const { auth, ensureUserDoc, onUserDoc } = window.App.firebase;
  const user = auth.currentUser;
  if (!user) return;

  // Pastikan doc user ada, lalu dengarkan realtime stat Farm
  ensureUserDoc(user.uid)
    .then(() => {
      onUserDoc(user.uid, (snap) => {
        if (!snap.exists()) return;
        renderFarm(snap.data() || {});
      });
    })
    .catch(err => {
      console.error('ensureUserDoc error', err);
      toast('Gagal memuat Farm');
    });

  // Render market (kartu hewan) sekali
  buildMarketList();
  // Isi angka + pasang handler tombol
  initFarmCards();

  // Tombol “Catatan transaksi”
  farmTab.querySelector('.farm-footer .chip.strong')
    ?.addEventListener('click', () => toast('Belum ada transaksi'));
}

// Setter manual kalau mau update dari modul lain
export function setFarmStats(payload = {}) {
  renderFarm(payload);
}

/* =======================================================================
 *  PRIVATE: Build Market (kartu) + binding
 * ======================================================================= */

function buildMarketList() {
  const wrap = $('#marketList', $('#farmTab'));
  if (!wrap) return;

  // Bersihkan agar tidak dobel
  wrap.innerHTML = '';

  // Bangun markup menggunakan gaya .animal-card.v2 (CSS sudah ada)
  const html = MARKET_ITEMS.map(item => {
    return `
<article class="animal-card v2 glass"
         data-animal="${item.animal}"
         data-price="${item.price}"
         data-daily="${item.daily}"
         data-contract="${item.contract}">
  <header class="ac-head">
    <img src="${item.img}" alt="${item.title}" class="ac-img">
    <div class="ac-title">${item.title}</div>
  </header>

  <div class="ac-price-line">
    <span>Harga:</span>
    <strong class="ac-price">${fmtRp(item.price)}</strong>
  </div>

  <div class="ac-stats">
    <div class="ac-stat">
      <div class="ac-big ac-daily">${fmtRp(item.daily)}</div>
      <div class="ac-sub">Pendapatan harian</div>
    </div>
    <div class="ac-stat">
      <div class="ac-big ac-total">${fmtRp(item.daily * item.contract)}</div>
      <div class="ac-sub">Total pendapatan</div>
    </div>
    <div class="ac-stat">
      <div class="ac-big ac-cycle">${item.contract} hari</div>
      <div class="ac-sub">Siklus</div>
    </div>
  </div>

  <button class="buy-btn btn-success">Beli</button>
</article>`;
  }).join('');

  wrap.insertAdjacentHTML('beforeend', html);
}

// Isi/ikat kartu hewan yang sudah dirender
function initFarmCards() {
  const cards = $$('.animal-card.v2', $('#farmTab'));
  if (!cards.length) return;

  cards.forEach(card => {
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);

    // Safety: sinkronkan angka lagi (kalau HTML diedit manual)
    card.querySelector('.ac-price') ?.replaceChildren(document.createTextNode(fmtRp(price)));
    card.querySelector('.ac-daily') ?.replaceChildren(document.createTextNode(fmtRp(daily)));
    card.querySelector('.ac-total') ?.replaceChildren(document.createTextNode(fmtRp(daily * contract)));
    const cycleEl = card.querySelector('.ac-cycle');
    if (cycleEl) cycleEl.textContent = `${contract} hari`;

    // Aksi beli
    card.querySelector('.buy-btn')?.addEventListener('click', () => {
      const name = (card.dataset.animal || card.querySelector('.ac-title')?.textContent || 'Item').toUpperCase();
      toast(`Beli ${name} seharga ${fmtRp(price)} ✅`);
      // TODO: di sini sambungkan ke flow/checkout Firestore kamu
    });
  });
}

/* =======================================================================
 *  PRIVATE: Render header saldo + metrics
 * ======================================================================= */
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

  // Urutan sesuai markup metric
  const values = [
    Number(profitAsset).toFixed(2), // Aset Keuntungan
    String(earningToday),           // Penghasilan Hari Ini
    Number(totalIncome).toFixed(2), // Total Pendapatan
    String(countableDays),          // Jumlah Hari yang Dapat Dihitung
    String(countdownDays)           // Hari Hitung Mundur
  ];

  $$('.metric', root).forEach((m, i) => {
    const v = m.querySelector('.metric-value');
    if (v && values[i] != null) v.textContent = values[i];
  });
}

/* =======================================================================
 *  Utils
 * ======================================================================= */
function toast(msg) {
  if (window.App?.toast) window.App.toast(msg);
  else alert(msg);
}
