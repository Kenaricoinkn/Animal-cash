// js/features/profile.js
import {
  getFirestore, collection, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================================
 *  Inisialisasi Profil + Ringkasan Farm
 * ========================================================================= */
export function initProfile(user) {
  try {
    // ---------- Rincian akun ----------
    const uidEl = document.getElementById('uid');
    if (uidEl) uidEl.textContent = user?.uid || '—';

    // Tampilkan hanya nomor (tanpa @phone.user)
    let who = user?.email || '';
    const dn = (user?.displayName || '').trim();
    if (dn.startsWith('tel:')) {
      who = dn.slice(4);
    } else if (who.endsWith('@phone.user')) {
      who = who.replace('@phone.user', '');
    }
    const whoEl = document.getElementById('who');
    if (whoEl) whoEl.textContent = who || '—';

    // ---------- Ringkasan Farm dari subkoleksi animals ----------
    const fb = window.App?.firebase;
    if (!fb?.db || !user?.uid) return;
    const db = fb.db || getFirestore();

    const ref = collection(db, 'users', user.uid, 'animals');
    onSnapshot(ref, (snap) => {
      let profitAsset = 0;
      let earningToday = 0;
      let totalIncome = 0;
      let countableDays = 0;
      let countdownDays = 0;
      let balance = 0; // masih bisa pakai field balance utama kalau ada

      const now = new Date();
      let minRemain = null;

      snap.forEach(d => {
        const v = d.data() || {};
        const daily = num(v.daily, 0);
        const contractDays = num(v.contractDays, 0);
        const active = !!v.active;

        const start = v.purchasedAt?.toDate ? v.purchasedAt.toDate() : null;
        const used = start ? daysBetween(start, now) : 0;
        const remain = Math.max(0, contractDays - used);

        totalIncome += daily * contractDays;
        if (active && remain > 0) {
          earningToday += daily;
          countableDays += remain;
          if (minRemain === null || remain < minRemain) minRemain = remain;
        }
      });

      countdownDays = minRemain ?? 0;
      profitAsset = totalIncome; // bisa diganti formula khusus kalau ada
      balance = profitAsset;     // fallback ke total aset

      // Tulis ke UI
      setText('.pf-quant', balance.toFixed(2));
      setText('.pf-total', fmtRp(balance, { maximumFractionDigits: 0 }));
      setText('.pf-total-approx', '≈ ' + fmtRp(balance));

      setText('.pf-profit', profitAsset.toFixed(2));
      setText('.pf-today', String(earningToday));
      setText('.pf-income', totalIncome.toFixed(2));
      setText('.pf-countable', String(countableDays));
      setText('.pf-countdown', String(countdownDays));
    });
  } catch (e) {
    console.error('initProfile error', e);
  }
}

/* ----------------- Helpers ----------------- */
function $(sel, root = document) { return root.querySelector(sel); }
function setText(sel, value) { const el = $(sel); if (el) el.textContent = value; }
function num(v, def = 0) { const n = Number(v); return Number.isFinite(n) ? n : def; }
function fmtRp(n, opt = {}) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR',
    maximumFractionDigits: 0, ...opt
  }).format(num(n, 0));
}
function daysBetween(d1, d2) {
  return Math.floor((d2 - d1) / (24 * 60 * 60 * 1000));
}
