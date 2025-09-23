// js/features/balance.js
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- helpers ---------- */
const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const fmtRp = (n,opt={}) => new Intl.NumberFormat("id-ID", {
  style:"currency", currency:"IDR", maximumFractionDigits:0, ...opt
}).format(Number(n||0));

/* ---------- init ---------- */
export function initBalanceWatcher(){
  const auth = window.App?.firebase?.auth || getAuth();
  const db   = window.App?.firebase?.db   || getFirestore();

  onAuthStateChanged(auth, (user)=>{
    if(!user) return;
    const uref = doc(db, "users", user.uid);

    // realtime: setiap balance berubah -> render ke semua elemen terkait
    onSnapshot(uref, (snap)=>{
      const data = snap.data() || {};
      const bal  = Number(data.balance || 0);

      // Home cards
      $$(".home-quant").forEach(el => el.textContent = bal.toFixed(2));
      $$(".home-total").forEach(el => el.textContent = fmtRp(bal));
      $$(".home-total-approx").forEach(el => el.textContent = `≈ ${fmtRp(bal)}`);

      // Withdraw cards (kalau mau ikut keep-in-sync)
      $$(".pf-quant").forEach(el => el.textContent = bal.toFixed(2));
      $$(".pf-total").forEach(el => el.textContent = fmtRp(bal));
      $$(".pf-total-approx").forEach(el => el.textContent = `≈ ${fmtRp(bal)}`);

      // optional: broadcast event kalau ada modul lain yang butuh
      document.dispatchEvent(new CustomEvent("balance:update", { detail:{ balance: bal }}));
    });
  });
}
