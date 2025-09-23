// js/features/withdraw.js (versi stabil)

import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, onSnapshot,
  collection, addDoc, serverTimestamp,
  query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- helpers ---------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const fmtRp = (n,opt={}) => new Intl.NumberFormat("id-ID", {
  style:"currency", currency:"IDR", maximumFractionDigits:0, ...opt
}).format(Number(n||0));
const toast = (m)=> (window.App?.toast ? window.App.toast(m) : alert(m));
const tsToLocal = (ts)=>{ try{const d=ts?.toDate?ts.toDate():null; return d?d.toLocaleString("id-ID"):"-";}catch{return"-";} };
const escapeHtml=(s="")=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- state ---------- */
const MIN_WD = 50000;
let CURRENT_BALANCE = 0;       // users/{uid}.balance
let PENDING_TOTAL   = 0;       // total withdrawals pending
let AVAILABLE       = 0;       // CURRENT_BALANCE - PENDING_TOTAL

/* ---------- init ---------- */
export function initWithdraw(){
  const auth = window.App?.firebase?.auth || getAuth();
  const db   = window.App?.firebase?.db   || getFirestore();

  const wdTab = $("#withdrawTab");
  if (!wdTab) return;

  const gate  = $("#gate");
  const appEl = $("#app");

  const tabWalletBtn = $("#wdTabWallet");
  const tabBankBtn   = $("#wdTabBank");
  const formWallet   = $("#wdFormWallet");
  const formBank     = $("#wdFormBank");

  // tab switching
  tabWalletBtn?.addEventListener("click", ()=>{
    tabWalletBtn.classList.add("tab-active");
    tabBankBtn && tabBankBtn.classList.remove("tab-active");
    formWallet && formWallet.classList.remove("hidden");
    formBank && formBank.classList.add("hidden");
  });
  tabBankBtn?.addEventListener("click", ()=>{
    tabBankBtn.classList.add("tab-active");
    tabWalletBtn && tabWalletBtn.classList.remove("tab-active");
    formBank && formBank.classList.remove("hidden");
    formWallet && formWallet.classList.add("hidden");
  });

  // listeners submit dipasang di luar snapshot supaya tidak ketahan error lain
  formWallet?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const user = auth.currentUser;
    if (!user){ toast("Silakan login."); return; }

    const provider = wdChecked("wallet") || "Dana";
    const number   = $("#wdwNumber")?.value?.trim();
    const name     = $("#wdwName")?.value?.trim();
    const amount   = Number($("#wdwAmount")?.value || 0);

    if (!validateAmount(amount)) return;
    if (!number || !name){ toast("Lengkapi nomor e-wallet dan nama pemilik."); return; }

    await addWithdrawal(db, { uid:user.uid, type:"ewallet", provider, number, name, amount });
  });

  formBank?.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const user = auth.currentUser;
    if (!user){ toast("Silakan login."); return; }

    const bank    = wdChecked("bank") || "Mandiri";
    const account = $("#wdbRek")?.value?.trim();
    const owner   = $("#wdbName")?.value?.trim();
    const amount  = Number($("#wdbAmount")?.value || 0);

    if (!validateAmount(amount)) return;
    if (!account || !owner){ toast("Lengkapi nomor rekening dan nama pemilik."); return; }

    await addWithdrawal(db, { uid:user.uid, type:"bank", bank, account, owner, amount });
  });

  onAuthStateChanged(auth, async (user)=>{
    if (!user) return;
    gate && gate.classList.add("hidden");
    appEl && appEl.classList.remove("hidden");

    const uid = user.uid;

    // 1) subscribe saldo user (realtime)
    const uref = doc(db,"users",uid);
    onSnapshot(uref, (snap)=>{
      CURRENT_BALANCE = Number(snap.data()?.balance || 0);
      renderBalance();
    }, (err)=>console.warn("[WD] users snap error:", err));

    // 2) subscribe total WD pending (realtime)
    const qPending = query(
      collection(db,"withdrawals"),
      where("uid","==",uid),
      where("status","==","pending")
    );
    onSnapshot(qPending, (snap)=>{
      let sum = 0;
      snap.forEach(d => sum += Number(d.data()?.amount || 0));
      PENDING_TOTAL = sum;
      calcAvailable();
    }, (err)=>console.warn("[WD] pendings snap error:", err));

    // 3) riwayat (realtime, terbaru dulu) — tidak memblokir submit bila error
    const qHist = query(
      collection(db,"withdrawals"),
      where("uid","==",uid),
      orderBy("createdAt","desc")
    );
    onSnapshot(qHist, (snap)=>{
      const list = $("#wdList");
      if (!list) return;
      if (snap.empty){
        list.innerHTML = `<li class="text-slate-400">Belum ada penarikan.</li>`;
        return;
      }
      const rows=[];
      snap.forEach(d=>{
        const v=d.data()||{};
        const tujuan = v.type==="ewallet"
          ? `${v.provider||"-"} • ${v.number||"-"}`
          : `${v.bank||"-"} • ${v.account||"-"}`;
        rows.push(
          `<li class="flex items-center justify-between gap-3">
             <div>
               <div class="font-medium">${fmtRp(v.amount)}</div>
               <div class="text-xs text-slate-400">${escapeHtml(tujuan)}</div>
             </div>
             <div class="text-right">
               <div class="chip ${statusBadge(v.status)}">${String(v.status||"").toUpperCase()}</div>
               <div class="text-[11px] text-slate-400">${tsToLocal(v.createdAt)}</div>
             </div>
           </li>`
        );
      });
      list.innerHTML = rows.join("");
    }, (err)=>console.warn("[WD] history snap error:", err));
  });
}

/* ---------- UI ---------- */
function renderBalance(){
  $$(".pf-quant").forEach(el=>{ if(el) el.textContent = Number(CURRENT_BALANCE).toFixed(2); });
  $$(".pf-total").forEach(el=>{ if(el) el.textContent = fmtRp(CURRENT_BALANCE); });
  $$(".pf-total-approx").forEach(el=>{ if(el) el.textContent = `≈ ${fmtRp(CURRENT_BALANCE)}`; });
  calcAvailable();
}
function calcAvailable(){
  AVAILABLE = Math.max(0, Number(CURRENT_BALANCE) - Number(PENDING_TOTAL||0));
}
function statusBadge(st){
  if (st==="approved") return "bg-emerald-500/20 text-emerald-300";
  if (st==="rejected") return "bg-rose-500/20 text-rose-300";
  return "bg-amber-500/20 text-amber-300";
}
function wdChecked(name){
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : null;
}

/* ---------- validation ---------- */
function validateAmount(amount){
  if (!Number.isFinite(amount) || amount <= 0){
    toast("Nominal tidak valid."); return false;
  }
  if (amount < MIN_WD){
    toast(`Minimal penarikan adalah ${fmtRp(MIN_WD)}.`); return false;
  }
  if (AVAILABLE <= 0){
    toast("Saldo 0 atau seluruh saldo sedang proses (pending)."); return false;
  }
  if (amount > AVAILABLE){
    toast(`Nominal melebihi saldo tersedia (${fmtRp(AVAILABLE)}).`); return false;
  }
  return true;
}

/* ---------- write ---------- */
async function addWithdrawal(db, payload){
  const createBtn = findSubmitBtn(payload.type==="ewallet" ? "#wdFormWallet" : "#wdFormBank");
  try{
    if (createBtn){ createBtn.disabled = true; createBtn.textContent = "Mengirim..."; }

    await addDoc(collection(db,"withdrawals"), {
      ...payload,
      status:"pending",
      createdAt: serverTimestamp()
    });

    if (createBtn){
      createBtn.disabled = true;
      createBtn.textContent = "Terkirim ✓";
      createBtn.classList.add("bg-emerald-500","text-black");
      setTimeout(()=>{
        createBtn.disabled = false;
        createBtn.textContent = "Ajukan Penarikan";
        createBtn.classList.remove("bg-emerald-500","text-black");
      }, 1200);
    }

    // kosongkan nominal
    const a1 = $("#wdwAmount"); if (a1) a1.value = "";
    const a2 = $("#wdbAmount"); if (a2) a2.value = "";

    toast("Pengajuan penarikan dikirim. Menunggu verifikasi admin.");
  }catch(e){
    console.error("[WD] addWithdrawal error:", e);
    toast("Gagal mengajukan penarikan. Coba lagi.");
    if (createBtn){
      createBtn.disabled = false;
      createBtn.textContent = "Ajukan Penarikan";
      createBtn.classList.remove("bg-emerald-500","text-black");
    }
  }
}
function findSubmitBtn(formSel){
  const f = $(formSel);
  return f ? f.querySelector('button[type="submit"]') : null;
}
