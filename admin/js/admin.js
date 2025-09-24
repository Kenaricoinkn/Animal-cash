// admin/js/admin.js
import {
  getAuth, onAuthStateChanged, signOut,
  RecaptchaVerifier, signInWithPhoneNumber,
  setPersistence, browserLocalPersistence, indexedDBLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getAuth, onAuthStateChanged, signOut,
  RecaptchaVerifier, signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs,
  doc, updateDoc, increment, addDoc, serverTimestamp, getDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
/* =================== CONFIG (jalur darurat) =================== */
const FALLBACK_ADMIN_UIDS = [
  // "UID_ADMIN_KAMU"
];

/* =================== HELPERS =================== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const fmtRp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0));
const escapeHtml = (s='') => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toLocal = ts => { try{const d=ts?.toDate?ts.toDate():null; return d?d.toLocaleString('id-ID'):'-';}catch{return'-';}};
const toast = m => alert(m);
async function sha256Hex(text){
  const enc = new TextEncoder().encode(String(text));
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* =================== EL REFS =================== */
const loginCard    = $('#loginCard');
const loginMsg     = $('#loginMsg');
const phoneInput   = $('#phoneInput');
const otpWrap      = $('#otpWrap');
const otpInput     = $('#otpInput');
const pinInput     = $('#pinInput');
const btnSendOTP   = $('#btnSendOTP');
const btnVerifyOTP = $('#btnVerifyOTP');

const gateBox   = $('#gate');
const adminArea = $('#adminArea');
const emailBox  = $('#adminEmail');
const btnLogout = $('#btnLogout');

const tblPurchBody = $('#tblPurch tbody');
const tblWdBody    = $('#tblWd tbody');
const tblAllBody   = $('#tblAll tbody');

$('#btnRefreshPurch')?.addEventListener('click', loadPurchPending);
$('#btnRefreshWd')?.addEventListener('click', loadWdPending);
$('#btnRefreshAll')?.addEventListener('click', loadHistoryAll);

/* =================== FIREBASE =================== */
/* =================== FIREBASE =================== */
const auth = window.App?.firebase?.auth || getAuth();
const db   = window.App?.firebase?.db   || getFirestore();

// Pastikan sesi disimpan di storage browser (tetap login setelah refresh / reopen)
setPersistence(auth, browserLocalPersistence)
  .catch(async () => {
    // fallback kalau environment tertentu menolak localStorage
    try { await setPersistence(auth, indexedDBLocalPersistence); }
    catch(e){ console.warn('[Auth persistence] fallback gagal:', e); }
  });
let recaptchaVerifier = null;
let confirmationResult = null;

/* =================== AUTH FLOW =================== */
// Recaptcha
function initRecaptcha(){
  if (recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha', {
    size: 'normal',
    callback: () => {},
    'expired-callback': () => {}
  });
}

// Kirim OTP
btnSendOTP?.addEventListener('click', async ()=>{
  try{
    loginMsg.textContent = '';
    const phone = (phoneInput.value||'').trim();
    if(!/^\+?\d{8,15}$/.test(phone)){ loginMsg.textContent='Format nomor tidak valid. Gunakan +62…'; return; }
    initRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    otpWrap.classList.remove('hidden');
    toast('OTP terkirim. Cek SMS.');
  }catch(e){ console.error(e); loginMsg.textContent='Gagal mengirim OTP. Coba lagi.'; }
});

// Verifikasi OTP (+ cek admin + cek PIN hash)
btnVerifyOTP?.addEventListener('click', async ()=>{
  try{
    loginMsg.textContent='';
    if(!confirmationResult){ loginMsg.textContent='Silakan kirim OTP dulu.'; return; }
    const code=(otpInput.value||'').trim();
    if(!/^\d{6}$/.test(code)){ loginMsg.textContent='Kode OTP harus 6 digit.'; return; }

    // 1) Login
    const cred = await confirmationResult.confirm(code);
    const user = cred.user;
    const uid  = user.uid;

    // 2) Ambil users/{uid}
    const usnap = await getDoc(doc(db,'users',uid));
    if(!usnap.exists()){ loginMsg.textContent=`Dokumen users/${uid} tidak ditemukan.`; return; }
    const u = usnap.data()||{};
    console.log('[DEBUG] user doc:', u);

    // 3) Cek hak admin
    const token         = await user.getIdTokenResult();
    const isAdminClaim  = !!token.claims?.admin;
    const isWhitelisted = FALLBACK_ADMIN_UIDS.includes(uid);
    const isAdminFlag   = u.isAdmin === true || u.role === 'admin';
    const isAdmin       = isAdminClaim || isWhitelisted || isAdminFlag;

    if(!isAdmin){ loginMsg.textContent='Nomor ini tidak memiliki hak admin (isAdmin=false).'; return; }

    // 4) PIN Admin (opsional — wajib jika field ada)
    if(u.adminPinHash){
      const pin=(pinInput.value||'').trim();
      if(!pin){ loginMsg.textContent='Masukkan PIN Admin.'; return; }
      const inHash=(await sha256Hex(pin)).toLowerCase();
      const docHash=String(u.adminPinHash).toLowerCase();
      if(inHash!==docHash){ loginMsg.textContent='PIN Admin salah.'; return; }
    }

    // 5) Sukses → buka panel
    loginCard.classList.add('hidden');
    adminArea.classList.remove('hidden');
    emailBox.textContent = user.phoneNumber || user.uid;

    await loadPurchPending();
    await loadWdPending();
    await loadHistoryAll();
  }catch(e){ console.error(e); loginMsg.textContent='Verifikasi gagal. Coba lagi.'; }
});

// Auto-restore sesi bila sudah login dan admin
onAuthStateChanged(auth, async (user)=>{
  if(!user) return;
  try{
    const uid   = user.uid;
    const token = await user.getIdTokenResult();
    const claim = !!token.claims?.admin;
    const white = FALLBACK_ADMIN_UIDS.includes(uid);
    const usnap = await getDoc(doc(db,'users',uid));
    const u     = usnap.exists()?(usnap.data()||{}):{};
    const flag  = u.isAdmin === true || u.role === 'admin';

    if(claim || white || flag){
      loginCard.classList.add('hidden');
      adminArea.classList.remove('hidden');
      emailBox.textContent = user.phoneNumber || user.uid;
      await loadPurchPending();
      await loadWdPending();
      await loadHistoryAll();
    }else{
      console.warn('[DEBUG] logged in but not admin', uid, u);
      loginMsg.textContent='Akun ini tidak memiliki hak admin.';
    }
  }catch(e){ console.error(e); }
});

// Logout
btnLogout?.addEventListener('click', async ()=>{
  await signOut(auth);
  location.reload();
});

/* =================== DATA LOADERS =================== */
// Purchases Pending
async function loadPurchPending(){
  if(!tblPurchBody) return;
  tblPurchBody.innerHTML = `<tr><td colspan="7" class="py-3 text-slate-400">Memuat...</td></tr>`;
  const rows=[];
  try{
    const q1=query(collection(db,'purchases'),
      where('status','==','pending'),
      orderBy('createdAt','desc'), limit(50));
    const snap=await getDocs(q1);
    snap.forEach(d=>{
      const v=d.data()||{};
      rows.push(renderPurchRow({
        id:d.id,
        time:toLocal(v.createdAt),
        uid:v.uid,
        item:`${v.animal||'-'} • harian ${fmtRp(v.daily||0)} • ${v.contractDays||0} hari`,
        price:v.price,
        proofUrl:v.proofUrl||'',
        status:v.status||'pending'
      }));
    });
  }catch(e){ console.warn(e); }
  if(!rows.length){ tblPurchBody.innerHTML=`<tr><td colspan="7" class="py-3 text-slate-400">Tidak ada pending.</td></tr>`; }
  else{ tblPurchBody.innerHTML=rows.join(''); bindPurchActions(tblPurchBody); }
}
function renderPurchRow({id,time,uid,item,price,proofUrl,status}){
  const proof = proofUrl ? `<a href="${proofUrl}" target="_blank" class="text-sky-300 underline">Bukti</a>` : `<span class="opacity-60">—</span>`;
  return `
    <tr data-id="${id}">
      <td class="py-2">${time}</td>
      <td>${uid}</td>
      <td>${escapeHtml(item)}</td>
      <td>${fmtRp(price)}</td>
      <td>${proof}</td>
      <td class="font-semibold">${String(status||'').toUpperCase()}</td>
      <td class="space-x-2">
        <button class="p-approve px-2 py-1 rounded bg-emerald-500/80 text-black text-xs">Approve</button>
        <button class="p-reject px-2 py-1 rounded bg-rose-500/80 text-black text-xs">Reject</button>
      </td>
    </tr>`;
}
function bindPurchActions(scope){
  scope.querySelectorAll('.p-approve').forEach(b=>b.addEventListener('click', approvePurchase));
  scope.querySelectorAll('.p-reject').forEach(b=>b.addEventListener('click', rejectPurchase));
}
async function approvePurchase(e){
  try{
    const tr = e.target.closest('tr');
    const id = tr?.dataset?.id;
    if(!id) return;

    await runTransaction(db, async (tx)=>{
      const pRef   = doc(db, 'purchases', id);
      const pSnap  = await tx.get(pRef);
      if(!pSnap.exists()) throw new Error('Dokumen purchase tidak ditemukan.');

      const p = pSnap.data();
      if(p.status !== 'pending') throw new Error('Purchase sudah diproses (bukan PENDING).');

      const uid   = String(p.uid);
      const animal= String(p.animal || '').trim();          // contoh: "COW"/"SHEEP" dst
      const price = Number(p.price || 0);

      // 1) set approved pada purchase
      tx.update(pRef, {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // 2) beri kepemilikan ternak ke user (aktifkan jika sudah ada)
      //    struktur: users/{uid}/animals/{animalId}
      const ownedRef = doc(db, 'users', uid, 'animals', animal);
      const ownedSnap = await tx.get(ownedRef);

      if(!ownedSnap.exists()){
        tx.set(ownedRef, {
          animal,
          daily: Number(p.daily || 0),
          contractDays: Number(p.contractDays || 0),
          purchasedAt: serverTimestamp(),
          purchaseId: id,
          active: true
        });
      }else{
        // kalau sudah ada, pastikan aktif & simpan purchaseId terakhir
        tx.update(ownedRef, {
          active: true,
          purchaseId: id,
          lastApprovedAt: serverTimestamp()
        });
      }

      // 3) catat log transaksi (opsional, untuk histori admin)
      const tRef = doc(collection(db, 'transactions'));
      tx.set(tRef, {
        uid,
        kind: 'purchase_approved',
        purchaseId: id,
        animal,
        amount: price,
        createdAt: serverTimestamp()
      });
    });

    // refresh tabel setelah berhasil
    await loadPurchPending();
    await loadHistoryAll();
  }catch(err){
    console.error(err);
    toast('Gagal approve purchase.');
  }
}
async function rejectPurchase(e){
  try{
    const tr = e.target.closest('tr');
    const id = tr?.dataset?.id;
    if(!id) return;

    const ref  = doc(db,'purchases',id);
    const snap = await getDoc(ref);
    if(!snap.exists()) throw new Error('Doc tidak ditemukan.');
    const d = snap.data();
    if(d.status !== 'pending') throw new Error('Status bukan pending.');

    await updateDoc(ref,{ status:'rejected', rejectedAt: serverTimestamp() });
    await loadPurchPending();
    await loadHistoryAll();
  }catch(err){
    console.error(err);
    toast('Gagal reject purchase.');
  }
}

// Withdrawals Pending
async function loadWdPending(){
  if(!tblWdBody) return;
  tblWdBody.innerHTML=`<tr><td colspan="6" class="py-3 text-slate-400">Memuat...</td></tr>`;
  const rows=[];
  try{
    const q2=query(collection(db,'withdrawals'),
      where('status','==','pending'),
      orderBy('createdAt','desc'), limit(50));
    const snap=await getDocs(q2);
    snap.forEach(d=>{
      const v=d.data()||{};
      const tujuan = v.type==='ewallet'
        ? `${v.provider||'-'} • ${v.number||'-'} • ${v.name||'-'}`
        : `${v.bank||'-'} • ${v.account||'-'} • ${v.owner||'-'}`;
      rows.push(renderWdRow({
        id:d.id, time:toLocal(v.createdAt), uid:v.uid, tujuan, amount:v.amount, status:v.status||'pending'
      }));
    });
  }catch(e){ console.warn(e); }
  if(!rows.length){ tblWdBody.innerHTML=`<tr><td colspan="6" class="py-3 text-slate-400">Tidak ada pending.</td></tr>`; }
  else{ tblWdBody.innerHTML=rows.join(''); bindWdActions(tblWdBody); }
}
function renderWdRow({id,time,uid,tujuan,amount,status}){
  return `
    <tr data-id="${id}">
      <td class="py-2">${time}</td>
      <td>${uid}</td>
      <td>${escapeHtml(tujuan)}</td>
      <td>${fmtRp(amount)}</td>
      <td class="font-semibold">${String(status||'').toUpperCase()}</td>
      <td class="space-x-2">
        <button class="w-approve px-2 py-1 rounded bg-emerald-500/80 text-black text-xs">Approve</button>
        <button class="w-reject px-2 py-1 rounded bg-rose-500/80 text-black text-xs">Reject</button>
      </td>
    </tr>`;
}
function bindWdActions(scope){
  scope.querySelectorAll('.w-approve').forEach(b=>b.addEventListener('click', approveWithdrawal));
  scope.querySelectorAll('.w-reject').forEach(b=>b.addEventListener('click', rejectWithdrawal));
}
async function approveWithdrawal(e){
  try{
    const tr=e.target.closest('tr'); const id=tr?.dataset?.id; if(!id) return;
    const ref=doc(db,'withdrawals',id); const snap=await getDoc(ref);
    if(!snap.exists()) throw new Error('Doc tidak ditemukan.');
    const d=snap.data(); if(d.status!=='pending') throw new Error('Status bukan pending.');

    const uid=d.uid; const amount=Number(d.amount||0);
    await updateDoc(ref,{status:'approved'});
    await updateDoc(doc(db,'users',uid), { balance: increment(-amount) });
    await addDoc(collection(db,'transactions'), {
      uid, kind:'withdrawal_approved', withdrawalId:id, amount, createdAt:serverTimestamp()
    });

    await loadWdPending(); await loadHistoryAll();
  }catch(err){ console.error(err); toast('Gagal approve withdrawal.'); }
}
async function rejectWithdrawal(e){
  try{
    const tr=e.target.closest('tr'); const id=tr?.dataset?.id; if(!id) return;
    await updateDoc(doc(db,'withdrawals',id), { status:'rejected' });
    await loadWdPending(); await loadHistoryAll();
  }catch(err){ console.error(err); toast('Gagal reject withdrawal.'); }
}

// Riwayat gabungan (50 terakhir)
async function loadHistoryAll(){
  if(!tblAllBody) return;
  tblAllBody.innerHTML=`<tr><td colspan="6" class="py-3 text-slate-400">Memuat...</td></tr>`;
  const rows=[];

  try{
    const qp=query(collection(db,'purchases'),
      where('status','in',['approved','rejected']),
      orderBy('createdAt','desc'), limit(50));
    const sp=await getDocs(qp);
    sp.forEach(d=>{
      const v=d.data()||{};
      rows.push(renderHist({
        time:toLocal(v.createdAt), jenis:'Purchase', uid:v.uid,
        amount:v.price,
        ref: v.proofUrl ? `<a href="${v.proofUrl}" target="_blank" class="text-sky-300 underline">Bukti</a>` : '—',
        status:v.status
      }));
    });
  }catch(e){ console.warn(e); }

  try{
    const qw=query(collection(db,'withdrawals'),
      where('status','in',['approved','rejected']),
      orderBy('createdAt','desc'), limit(50));
    const sw=await getDocs(qw);
    sw.forEach(d=>{
      const v=d.data()||{};
      const tujuan=v.type==='ewallet' ? `${v.provider||'-'} • ${v.number||'-'}` : `${v.bank||'-'} • ${v.account||'-'}`;
      rows.push(renderHist({
        time:toLocal(v.createdAt), jenis:'Withdrawal', uid:v.uid,
        amount:v.amount, ref:escapeHtml(tujuan), status:v.status
      }));
    });
  }catch(e){ console.warn(e); }

  if(!rows.length){ tblAllBody.innerHTML=`<tr><td colspan="6" class="py-3 text-slate-400">Belum ada riwayat.</td></tr>`; }
  else{ tblAllBody.innerHTML=rows.join(''); }
}
function renderHist({time,jenis,uid,amount,ref,status}){
  return `
    <tr>
      <td class="py-2">${time}</td>
      <td>${jenis}</td>
      <td>${uid}</td>
      <td>${fmtRp(amount)}</td>
      <td>${ref}</td>
      <td class="font-semibold">${String(status||'-').toUpperCase()}</td>
    </tr>`;
}
