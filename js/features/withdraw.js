// js/features/withdraw.js
import {
  getAuth, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, getDoc, collection, addDoc, serverTimestamp,
  onSnapshot, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* --------------- helpers --------------- */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const fmtRp = (n,opt={}) => new Intl.NumberFormat('id-ID',{
  style:'currency', currency:'IDR', maximumFractionDigits:0, ...opt
}).format(Number(n||0));

// SELALU munculkan alert agar pasti terlihat di mobile.
// Kalau ada App.toast, tetap dipanggil juga.
function toast(msg){
  try { window.App?.toast?.(msg); } catch {}
  alert(msg);
}

/* ================== STATE ================== */
const MIN_WD = 50000;                 // minimal penarikan
let CURRENT_BALANCE = 0;              // users/{uid}.balance
let PENDING_TOTAL   = 0;              // total WD status pending
let AVAILABLE       = 0;              // saldo yg bisa ditarik (balance - pending)

/* ================== INIT ================== */
export function initWithdraw() {
  const auth = window.App?.firebase?.auth || getAuth();
  const db   = window.App?.firebase?.db   || getFirestore();

  const gate  = $('#gate');
  const appEl = $('#app');
  const wdTab = $('#withdrawTab');
  if (!wdTab) return;

  // switch tab E-wallet vs Bank
  const tabWalletBtn = $('#wdTabWallet');
  const tabBankBtn   = $('#wdTabBank');
  const formWallet   = $('#wdFormWallet');
  const formBank     = $('#wdFormBank');

  tabWalletBtn?.addEventListener('click', ()=>{
    tabWalletBtn.classList.add('tab-active'); tabBankBtn?.classList.remove('tab-active');
    formWallet?.classList.remove('hidden');   formBank?.classList.add('hidden');
  });
  tabBankBtn?.addEventListener('click', ()=>{
    tabBankBtn.classList.add('tab-active');   tabWalletBtn?.classList.remove('tab-active');
    formBank?.classList.remove('hidden');     formWallet?.classList.add('hidden');
  });

  // tunggu login
  onAuthStateChanged(auth, async (user)=>{
    if (!user) return;
    gate?.classList.add('hidden');
    appEl?.classList.remove('hidden');

    const uid = user.uid;

    // 1) ambil saldo awal user
    try{
      const usnap = await getDoc(doc(db,'users',uid));
      CURRENT_BALANCE = Number(usnap.data()?.balance || 0);
    }catch{ CURRENT_BALANCE = 0; }
    renderBalance();

    // 2) subscribe total WD pending user → hitung AVAILABLE
    const qPending = query(
      collection(db,'withdrawals'),
      where('uid', '==', uid),
      where('status', '==', 'pending')
    );
    onSnapshot(qPending, (snap)=>{
      let sum = 0;
      snap.forEach(d => sum += Number(d.data()?.amount || 0));
      PENDING_TOTAL = sum;
      calcAvailable();
    });

    // 3) render riwayat realtime (semua status), terbaru dulu
    const qHist = query(
      collection(db,'withdrawals'),
      where('uid', '==', uid),
      orderBy('createdAt','desc')
    );
    onSnapshot(qHist, (snap)=>{
      const list = $('#wdList');
      if (!list) return;
      if (snap.empty) {
        list.innerHTML = `<li class="text-slate-400">Belum ada penarikan.</li>`;
        return;
      }
      const rows = [];
      snap.forEach(d=>{
        const v = d.data() || {};
        const tujuan = v.type === 'ewallet'
          ? `${v.provider||'-'} • ${v.number||'-'}`
          : `${v.bank||'-'} • ${v.account||'-'}`;
        const time = tsToLocal(v.createdAt);
        rows.push(
          `<li class="flex items-center justify-between gap-3">
             <div>
               <div class="font-medium">${fmtRp(v.amount)}</div>
               <div class="text-xs text-slate-400">${escapeHtml(tujuan)}</div>
             </div>
             <div class="text-right">
               <div class="chip ${statusBadge(v.status)}">${String(v.status||'').toUpperCase()}</div>
               <div class="text-[11px] text-slate-400">${time}</div>
             </div>
           </li>`
        );
      });
      list.innerHTML = rows.join('');
    });

    // 4) submit form e-wallet
    formWallet?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const provider = (wdChecked('wallet') || 'Dana');
      const number   = $('#wdwNumber')?.value?.trim();
      const name     = $('#wdwName')?.value?.trim();
      const amount   = Number($('#wdwAmount')?.value || 0);

      if (!validateAmount(amount)) return;
      if (!number || !name) { toast('Lengkapi nomor dan nama pemilik.'); return; }

      await addWithdrawal(db, { uid, type:'ewallet', provider, number, name, amount });
    });

    // 5) submit form bank
    formBank?.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const bank    = (wdChecked('bank') || 'Mandiri');
      const account = $('#wdbRek')?.value?.trim();
      const owner   = $('#wdbName')?.value?.trim();
      const amount  = Number($('#wdbAmount')?.value || 0);

      if (!validateAmount(amount)) return;
      if (!account || !owner) { toast('Lengkapi nomor rekening dan nama pemilik.'); return; }

      await addWithdrawal(db, { uid, type:'bank', bank, account, owner, amount });
    });
  });
}

/* ================== UI / RENDER ================== */

function renderBalance(){
  $$('.pf-quant').forEach(el=> el.textContent = Number(CURRENT_BALANCE).toFixed(2));
  $$('.pf-total').forEach(el=> el.textContent = fmtRp(CURRENT_BALANCE));
  $$('.pf-total-approx').forEach(el=> el.textContent = `≈ ${fmtRp(CURRENT_BALANCE)}`);
  calcAvailable();
}

function calcAvailable(){
  AVAILABLE = Math.max(0, Number(CURRENT_BALANCE) - Number(PENDING_TOTAL||0));
}

function statusBadge(st){
  if (st === 'approved') return 'bg-emerald-500/20 text-emerald-300';
  if (st === 'rejected') return 'bg-rose-500/20 text-rose-300';
  return 'bg-amber-500/20 text-amber-300'; // pending
}

function tsToLocal(ts){
  try{
    const d = ts?.toDate ? ts.toDate() : null;
    return d ? d.toLocaleString('id-ID') : '-';
  }catch{ return '-'; }
}

function escapeHtml(s=''){
  return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function wdChecked(name){
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el?.value || null;
}

/* ================== VALIDATION ================== */

function validateAmount(amount){
  // saldo di bawah minimal → langsung kasih tahu user
  if (AVAILABLE < MIN_WD){
    toast(`Saldo Anda kurang dari minimal penarikan (${fmtRp(MIN_WD)}).`);
    return false;
  }
  if (!Number.isFinite(amount) || amount <= 0){
    toast('Nominal tidak valid.');
    return false;
  }
  if (amount < MIN_WD){
    toast(`Minimal penarikan adalah ${fmtRp(MIN_WD)}.`);
    return false;
  }
  if (amount > AVAILABLE){
    toast(`Nominal melebihi saldo tersedia (${fmtRp(AVAILABLE)}).`);
    return false;
  }
  return true;
}

/* ================== FIRESTORE WRITE ================== */

async function addWithdrawal(db, payload){
  try{
    const createBtn = findSubmitBtn(payload.type === 'ewallet' ? '#wdFormWallet' : '#wdFormBank');
    if (createBtn){ createBtn.disabled = true; createBtn.textContent = 'Mengirim...'; }

    await addDoc(collection(db, 'withdrawals'), {
      ...payload,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    if (createBtn){
      createBtn.disabled = true;
      createBtn.textContent = 'Terkirim ✓';
      createBtn.classList.add('bg-emerald-500','text-black');
      setTimeout(()=>{
        createBtn.disabled = false;
        createBtn.textContent = 'Ajukan Penarikan';
        createBtn.classList.remove('bg-emerald-500','text-black');
      }, 1200);
    }
    toast('Pengajuan penarikan dikirim. Menunggu verifikasi admin.');
    const a1 = $('#wdwAmount'); if (a1) a1.value = '';
    const a2 = $('#wdbAmount'); if (a2) a2.value = '';
  }catch(e){
    console.error(e);
    toast('Gagal mengajukan penarikan. Coba lagi.');
    const createBtn = findSubmitBtn(payload.type === 'ewallet' ? '#wdFormWallet' : '#wdFormBank');
    if (createBtn){
      createBtn.disabled = false;
      createBtn.textContent = 'Ajukan Penarikan';
      createBtn.classList.remove('bg-emerald-500','text-black');
    }
  }
}

function findSubmitBtn(formSel){
  const f = $(formSel);
  if (!f) return null;
  return f.querySelector('button[type="submit"]');
}

/* ============ Safe auto-run jika tidak dipanggil manual ============ */
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    try { initWithdraw(); } catch {}
  });
}
