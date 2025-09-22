// js/features/farm.js — versi Cloudinary unsigned preset

// =================== Helpers ===================
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const fmtRp = (n, opt = {}) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
    ...opt
  }).format(Number(n || 0));

const toast = (msg) => window.App?.toast ? window.App.toast(msg) : alert(msg);

// =================== Cloudinary Config ===================
const CLOUD_NAME = "dszl9phmt";       // ganti sesuai akunmu
const UPLOAD_PRESET = "ml_default";  // unsigned preset
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

// =================== Firebase Import ===================
import {
  getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================================
 *  PUBLIC API
 * ========================================================================= */
export function initFarm() {
  const farmTab = $('#farmTab');
  if (!farmTab || !window.App?.firebase) return;

  const { auth, ensureUserDoc, onUserDoc } = window.App.firebase;
  const user = auth.currentUser;
  if (!user) return;

  ensureUserDoc(user.uid)
    .then(() => {
      onUserDoc(user.uid, snap => {
        if (!snap.exists()) return;
        renderFarm(snap.data() || {});
      });
    })
    .catch(e => {
      console.error('ensureUserDoc error', e);
      toast('Gagal memuat Farm');
    });

  initFarmCards();
}

/* =========================================================================
 *  MARKETPLACE + QR ADMIN MODAL
 * ========================================================================= */
export function initFarmCards() {
  const cards = $$('#marketList .market-card, .animal-card.v2');
  if (!cards.length) return;

  const modal   = $('#buyModal');
  const closeBt = $('#closeBuy');
  const form    = $('#buyForm');
  const proofEl = $('#proof');
  const nameEl  = $('#buyAnimal');
  const priceEl = $('#buyPrice');

  const auth = window.App?.firebase?.auth;
  const db   = window.App?.firebase?.db || getFirestore();

  let selected = null;

  cards.forEach(card => {
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);
    const total    = daily * contract;

    const priceElCard = card.querySelector('.ac-price, .mc-price b');
    if (priceElCard) priceElCard.textContent = fmtRp(price);

    if (card.classList.contains('market-card')) {
      const d = card.querySelectorAll('.mc-stat .mc-big')[0];
      const t = card.querySelectorAll('.mc-stat .mc-big')[1];
      if (d) d.textContent = fmtRp(daily);
      if (t) t.textContent = fmtRp(total);
      const c = card.querySelector('.mc-contract');
      if (c) c.textContent = `${contract} hari`;
    }

    card.querySelector('.buy-btn, .buy-btn-green')?.addEventListener('click', () => {
      const name = (card.dataset.animal || card.querySelector('.mc-title')?.textContent || 'Item').toUpperCase();
      selected = { animal: name, price, daily, days: contract };

      if (nameEl)  nameEl.textContent  = name;
      if (priceEl) priceEl.textContent = fmtRp(price);

      form?.reset();
      modal?.classList.remove('hidden');
      modal?.classList.add('flex');
    });
  });

  closeBt?.addEventListener('click', () => {
    modal?.classList.add('hidden');
    modal?.classList.remove('flex');
  });

  // === Submit bukti transfer ===
  form?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const user = auth?.currentUser;
    if (!user) return toast('Silakan login.');
    if (!selected?.animal) return toast('Data produk tidak valid.');
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
        payMethod: 'QR_ADMIN',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2) Upload ke Cloudinary (unsigned)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(UPLOAD_URL, { method: "POST", body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error("Upload gagal");

      // 3) Update dokumen dengan proofUrl
      await updateDoc(doc(db, 'purchases', docRef.id), {
        proofUrl: data.secure_url
      });

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
 *  PRIVATE: Render saldo + metrik
 * ========================================================================= */
function renderFarm({
  balance = 0,
  profitAsset = 0,
  earningToday = 0,
  totalIncome = 0,
  countableDays = 210,
  countdownDays = 210
} = {}) {
  $$('.farm-balance').forEach(el => {
    el.textContent = Number(balance).toFixed(2);
  });

  const values = [
    Number(profitAsset).toFixed(2),
    String(earningToday),
    Number(totalIncome).toFixed(2),
    String(countableDays),
    String(countdownDays)
  ];

  $$('.metric-grid').forEach(grid => {
    $$('.metric', grid).forEach((m, i) => {
      const v = m.querySelector('.metric-value');
      if (v && values[i] != null) v.textContent = values[i];
    });
  });
}
