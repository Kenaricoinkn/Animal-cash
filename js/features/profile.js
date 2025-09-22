// js/features/profile.js
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

    // ---------- Isi Ringkasan Farm dari Firestore ----------
    const fb = window.App?.firebase;
    if (!fb?.onUserDoc || !user?.uid) return;

    fb.onUserDoc(user.uid, (snap) => {
      if (!snap.exists()) return;
      const d = snap.data() || {};

      // Ambil nilai dengan default aman
      const balance       = num(d.balance, 0);        // Akun Kuantitatif
      const profitAsset   = num(d.profitAsset, 0);
      const earningToday  = num(d.earningToday, 0);
      const totalIncome   = num(d.totalIncome, 0);
      const countableDays = num(d.countableDays, 210);
      const countdownDays = num(d.countdownDays, 210);

      // Saldo Kuantitatif (2 desimal)
      setText('.pf-quant', balance.toFixed(2));

      // Total aset (anggap sama dengan saldo dalam IDR — bila nanti ada field khusus,
      // tinggal ganti ke d.totalAssets)
      setText('.pf-total', fmtRp(balance, { maximumFractionDigits: 0 }));
      setText('.pf-total-approx', '≈ ' + fmtRp(balance));

      // Metrik lainnya
      setText('.pf-profit',    profitAsset.toFixed(2));
      setText('.pf-today',     String(earningToday));
      setText('.pf-income',    totalIncome.toFixed(2));
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
