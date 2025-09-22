// js/features/farm.js

// =================== Helpers lama (dipertahankan) ===================
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmtRp = (n, opt = {}) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    ...opt
  }).format(Number(n || 0));

// ================ Import Firebase (modular CDN) =====================
import {
  getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

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

  // Inisialisasi kartu hewan (marketplace) + BUY modal
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

/* =========================================================================
 *  MARKETPLACE + QR ADMIN MODAL
 * ========================================================================= */
export function initFarmCards() {
  const cards = $$('#marketList .market-card, .animal-card.v2', document);
  if (!cards.length) return;

  // elemen modal (sudah kamu tempel di dashboard.html)
  const modal   = $('#buyModal');
  const closeBt = $('#closeBuy');
  const form    = $('#buyForm');
  const proofEl = $('#proof');
  const nameEl  = $('#buyAnimal');
  const priceEl = $('#buyPrice');

  // Firebase instances (pakai yang sudah di-init di App; fallback buat sendiri)
  const auth  = window.App?.firebase?.auth;
  const db    = window.App?.firebase?.db  || getFirestore();
  const stg   = window.App?.firebase?.stg || getStorage();

  let selected = null; // state item yang sedang dibeli

  cards.forEach(card => {
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);
    const total    = daily * contract;

    // Isi UI (market v1/v2)
    const priceElCard = card.querySelector('.ac-price, .mc-price b');
    if (priceElCard) priceElCard.textContent = fmtRp(price);

    if (card.classList.contains('market-card')) {
      const d = card.querySelectorAll('.mc-stat .mc-big')[0];
      const t = card.querySelectorAll('.mc-stat .mc-big')[1];
      if (d) d.textContent = fmtRp(daily);
      if (t) t.textContent = fmtRp(total);
      const c = card.querySelector('.mc-contract, .mc-stat .mc-big:nth-child(3)');
      if (c) c.textContent = `${contract} hari`;
    } else {
      const dailyEl = card.querySelector('.ac-daily');
      if (dailyEl) dailyEl.textContent = fmtRp(daily);
      const totalEl = card.querySelector('.ac-total');
      if (totalEl) totalEl.textContent = fmtRp(total);
      const cycleEl = card.querySelector('.ac-cycle');
      if (cycleEl) cycleEl.textContent = `${contract} hari`;
    }

    // === Klik Beli → buka modal QR admin ===
    card.querySelector('.buy-btn, .buy-btn-green')?.addEventListener('click', () => {
      const name = (card.dataset.animal || card.querySelector('.ac-title, .mc-title')?.textContent || 'Item').toUpperCase();

      selected = {                 // simpan detail untuk dibuatkan purchase
        animal: name,
        price,
        daily,
        days: contract
      };

      if (nameEl)  nameEl.textContent  = name;
      if (priceEl) priceEl.textContent = fmtRp(price);

      form?.reset();
      modal?.classList.remove('hidden');
      modal?.classList.add('flex'); // modal pakai flex (center)
    }, { once: false });
  });

  // Tutup modal
  closeBt?.addEventListener('click', () => {
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  });

  // Submit bukti transfer
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const user = auth?.currentUser;
    if (!user) return toast('Silakan login.');
    if (!selected?.animal || !selected?.price) return toast('Data produk tidak valid.');
    const file = proofEl?.files?.[0];
    if (!file) return toast('Unggah bukti transfer terlebih dahulu.');

    try {
      // 1) Buat dokumen purchase (pending)
      const docRef = await addDoc(collection(db, 'purchases'), {
        uid: user.uid,
        animal: selected.animal,
        price: selected.price,
        daily: selected.daily,
        contractDays: selected.days,
        payMethod: 'QR_ADMIN', // QR admin statis
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2) Upload bukti ke Storage
      const path = `purchases/${user.uid}/${docRef.id}/proof.jpg`;
      await uploadBytes(ref(stg, path), file);

      // 3) Ambil URL & update dokumen
      const proofUrl = await getDownloadURL(ref(stg, path));
      await updateDoc(doc(db, 'purchases', docRef.id), { proofUrl });

      toast('Bukti terkirim. Menunggu verifikasi admin.');
      modal?.classList.add('hidden');
      modal?.classList.remove('flex');
      form?.reset();
    } catch (err) {
      console.error(err);
      toast('Gagal mengirim bukti. Coba lagi.');
    }
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
