// admin/js/admin.js
import {
  getAuth, onAuthStateChanged, signOut,
  RecaptchaVerifier, signInWithPhoneNumber,
  setPersistence, browserLocalPersistence, indexedDBLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs,
  doc, updateDoc, addDoc, serverTimestamp, getDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* ---------- helpers ---------- */
const $  = (s, r=document)=>r.querySelector(s);
const fmtRp = n => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(+n||0);
const esc = (s='') => s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toLocal = ts => { try{const d=ts?.toDate?ts.toDate():null; return d?d.toLocaleString('id-ID'):'-';}catch{return'-';}};
const toast = m => alert(m);

/* ---------- el refs ---------- */
const loginCard = $('#loginCard');
const adminArea = $('#adminArea');
const loginMsg  = $('#loginMsg');
const phoneInp  = $('#phoneInput');
const otpWrap   = $('#otpWrap');
const otpInp    = $('#otpInput');
const pinInp    = $('#pinInput');
const btnSend   = $('#btnSendOTP');
const btnVerify = $('#btnVerifyOTP');
const btnLogout = $('#btnLogout');

const tblPurchBody = $('#tblPurch tbody');
const tblWdBody    = $('#tblWd tbody');
const tblAllBody   = $('#tblAll tbody');

$('#btnRefreshPurch')?.addEventListener('click', loadPurchPending);
$('#btnRefreshWd')?.addEventListener('click', loadWdPending);
$('#btnRefreshAll')?.addEventListener('click', loadHistoryAll);

/* ---------- firebase ---------- */
const auth = window.App?.firebase?.auth || getAuth();
const db   = window.App?.firebase?.db   || getFirestore();

setPersistence(auth, browserLocalPersistence).catch(()=>setPersistence(auth, indexedDBLocalPersistence));

/* ---------- OTP ---------- */
let recaptcha, confirmation;
function ensureRecaptcha(){
  if (recaptcha) return;
  // pastikan di HTML ada: <div id="recaptcha"></div>
  recaptcha = new RecaptchaVerifier(auth, 'recaptcha', { size:'normal' });
}

btnSend?.addEventListener('click', async ()=>{
  try{
    loginMsg.textContent = '';
    const phone = (phoneInp.value||'').trim();
    if(!/^\+?\d{8,15}$/.test(phone)){ loginMsg.textContent='Format nomor tidak valid (+62…)'; return; }
    ensureRecaptcha();
    confirmation = await signInWithPhoneNumber(auth, phone, recaptcha);
    otpWrap.classList.remove('hidden');
    toast('OTP terkirim. Cek SMS.');
  }catch(e){ console.error(e); loginMsg.textContent = 'Gagal kirim OTP: ' + (e.message||e.code||e); }
});

btnVerify?.addEventListener('click', async ()=>{
  try{
    loginMsg.textContent = '';
    if(!confirmation){ loginMsg.textContent='Kirim OTP dulu.'; return; }
    const code = (otpInp.value||'').trim();
    if(!/^\d{6}$/.test(code)){ loginMsg.textContent='Kode OTP 6 digit.'; return; }

    const cred = await confirmation.confirm(code);
    const user = cred.user;

    // validasi hak admin di users/{uid}
    const usnap = await getDoc(doc(db,'users',user.uid));
    const u = usnap.exists()? (usnap.data()||{}) : {};
    if(!(u.isAdmin === true || u.role === 'admin')){ loginMsg.textContent='Akun ini bukan admin.'; return; }

    // opsional: PIN admin
    if(u.adminPinHash){
      const pin = (pinInp.value||'').trim();
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
      const hex  = [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(hex.toLowerCase() !== String(u.adminPinHash).toLowerCase()){ loginMsg.textContent='PIN Admin salah.'; return; }
    }

    loginCard?.classList.add('hidden');
    adminArea?.classList.remove('hidden');

    await Promise.all([loadPurchPending(), loadWdPending(), loadHistoryAll()]);
  }catch(e){ console.error(e); loginMsg.textContent = 'Verifikasi gagal: ' + (e.message||e.code||e); }
});

onAuthStateChanged(auth, async (user)=>{
  if(!user) return;
  try{
    const usnap = await getDoc(doc(db,'users',user.uid));
    const u = usnap.exists()? (usnap.data()||{}) : {};
    if(u.isAdmin === true || u.role === 'admin'){
      loginCard?.classList.add('hidden');
      adminArea?.classList.remove('hidden');
      await Promise.all([loadPurchPending(), loadWdPending(), loadHistoryAll()]);
    }
  }catch(e){ console.error(e); }
});

btnLogout?.addEventListener('click', ()=>signOut(auth));

/* ---------- LOADERS ---------- */
// Purchases pending
async function loadPurchPending(){
  if(!tblPurchBody) return;
  tblPurchBody.innerHTML = rowEmpty('Memuat...');
  const rows=[];
  try{
    const snap=await getDocs(query(
      collection(db,'purchases'),
      where('status','==','pending'),
      orderBy('createdAt','desc'),
      limit(50)
    ));
    snap.forEach(d=>{
      const v=d.data()||{};
      rows.push(`
        <tr data-id="${d.id}">
          <td>${toLocal(v.createdAt)}</td>
          <td>${v.uid}</td>
          <td>${esc(`${v.animal||'-'} • harian ${fmtRp(v.daily||0)} • ${v.contractDays||0} hari`)}</td>
          <td>${fmtRp(v.price)}</td>
          <td>${v.proofUrl?`<a href="${v.proofUrl}" target="_blank" class="text-sky-300 underline">Bukti</a>`:'—'}</td>
          <td class="font-semibold">PENDING</td>
          <td class="space-x-2">
            <button class="p-approve px-2 py-1 rounded bg-emerald-500/80 text-black text-xs">Approve</button>
            <button class="p-reject  px-2 py-1 rounded bg-rose-500/80    text-black text-xs">Reject</button>
          </td>
        </tr>
      `);
    });
  }catch(e){ console.error(e); }
  tblPurchBody.innerHTML = rows.length? rows.join('') : rowEmpty('Tidak ada pending.');
  tblPurchBody.querySelectorAll('.p-approve').forEach(b=>b.addEventListener('click', approvePurchase));
  tblPurchBody.querySelectorAll('.p-reject').forEach(b=>b.addEventListener('click', rejectPurchase));
}

function rowEmpty(msg){ return `<tr><td colspan="7" class="py-3 text-slate-400">${msg}</td></tr>`; }

// Withdrawals pending
async function loadWdPending(){
  if(!tblWdBody) return;
  tblWdBody.innerHTML = rowEmpty('Memuat...');
  const rows=[];
  try{
    const snap=await getDocs(query(
      collection(db,'withdrawals'),
      where('status','==','pending'),
      orderBy('createdAt','desc'),
      limit(50)
    ));
    snap.forEach(d=>{
      const v=d.data()||{};
      const tujuan = v.type==='ewallet'
        ? `${v.provider||'-'} • ${v.number||'-'} • ${v.name||'-'}`
        : `${v.bank||'-'} • ${v.account||'-'} • ${v.owner||'-'}`;
      rows.push(`
        <tr data-id="${d.id}">
          <td>${toLocal(v.createdAt)}</td>
          <td>${v.uid}</td>
          <td>${esc(tujuan)}</td>
          <td>${fmtRp(v.amount)}</td>
          <td class="font-semibold">PENDING</td>
          <td class="space-x-2">
            <button class="w-approve px-2 py-1 rounded bg-emerald-500/80 text-black text-xs">Approve</button>
            <button class="w-reject  px-2 py-1 rounded bg-rose-500/80    text-black text-xs">Reject</button>
          </td>
        </tr>
      `);
    });
  }catch(e){ console.error(e); }
  tblWdBody.innerHTML = rows.length? rows.join('') : rowEmpty('Tidak ada pending.');
  tblWdBody.querySelectorAll('.w-approve').forEach(b=>b.addEventListener('click', approveWithdrawal));
  tblWdBody.querySelectorAll('.w-reject').forEach(b=>b.addEventListener('click', rejectWithdrawal));
}

// Riwayat campur
async function loadHistoryAll(){
  if(!tblAllBody) return;
  tblAllBody.innerHTML = rowEmpty('Memuat...');
  const rows=[];

  try{
    const sp=await getDocs(query(
      collection(db,'purchases'),
      where('status','in',['approved','rejected']),
      orderBy('createdAt','desc'),
      limit(50)
    ));
    sp.forEach(d=>{
      const v=d.data()||{};
      rows.push(histRow(toLocal(v.createdAt),'Purchase', v.uid, v.price, v.proofUrl?`<a href="${v.proofUrl}" target="_blank" class="text-sky-300 underline">Bukti</a>`:'—', v.status));
    });
  }catch(e){ console.warn(e); }

  try{
    const sw=await getDocs(query(
      collection(db,'withdrawals'),
      where('status','in',['approved','rejected']),
      orderBy('createdAt','desc'),
      limit(50)
    ));
    sw.forEach(d=>{
      const v=d.data()||{};
      const tujuan=v.type==='ewallet' ? `${v.provider||'-'} • ${v.number||'-'}` : `${v.bank||'-'} • ${v.account||'-'}`;
      rows.push(histRow(toLocal(v.createdAt),'Withdrawal', v.uid, v.amount, esc(tujuan), v.status));
    });
  }catch(e){ console.warn(e); }

  tblAllBody.innerHTML = rows.length? rows.join('') : rowEmpty('Belum ada riwayat.');
}

function histRow(time, jenis, uid, amount, ref, status){
  return `<tr><td>${time}</td><td>${jenis}</td><td>${uid}</td><td>${fmtRp(amount)}</td><td>${ref}</td><td class="font-semibold">${String(status||'-').toUpperCase()}</td></tr>`;
}

/* ---------- Actions: Approve/Reject ---------- */
async function approvePurchase(ev){
  const id = ev.target.closest('tr')?.dataset?.id;
  if(!id) return;

  try{
    await runTransaction(db, async (tx)=>{
      const pRef  = doc(db,'purchases',id);
      const pSnap = await tx.get(pRef);
      if(!pSnap.exists()) throw new Error('Doc purchase tidak ditemukan');

      const p = pSnap.data();
      if(p.status !== 'pending') throw new Error('Status bukan pending');

      const uid    = String(p.uid||'');
      const animal = String(p.animal||'').trim() || 'ITEM';

      // set approved
      tx.update(pRef, { status:'approved', approvedAt: serverTimestamp() });

      // beri kepemilikan ternak → users/{uid}/animals/{animal}
      const ownRef = doc(db,'users',uid,'animals',animal);
      const ownSnap = await tx.get(ownRef);
      if(!ownSnap.exists()){
        tx.set(ownRef, {
          animal, daily:+(p.daily||0), contractDays:+(p.contractDays||0),
          purchasedAt: serverTimestamp(), purchaseId: id, active:true
        });
      }else{
        tx.update(ownRef, { active:true, purchaseId:id, lastApprovedAt: serverTimestamp() });
      }

      // catat transaksi
      tx.set(doc(collection(db,'transactions')), {
        uid, kind:'purchase_approved', purchaseId:id, animal,
        amount:+(p.price||0), createdAt: serverTimestamp()
      });
    });

    await Promise.all([loadPurchPending(), loadHistoryAll()]);
  }catch(e){
    console.error('[approvePurchase]', e);
    toast('Gagal approve purchase.');
  }
}

async function rejectPurchase(ev){
  const id = ev.target.closest('tr')?.dataset?.id;
  if(!id) return;
  try{
    await updateDoc(doc(db,'purchases',id), { status:'rejected', rejectedAt: serverTimestamp() });
    await Promise.all([loadPurchPending(), loadHistoryAll()]);
  }catch(e){ console.error(e); toast('Gagal reject purchase.'); }
}

async function approveWithdrawal(ev){
  const id = ev.target.closest('tr')?.dataset?.id;
  if(!id) return;
  try{
    const ref = doc(db,'withdrawals',id);
    const snap= await getDoc(ref);
    if(!snap.exists()) throw new Error('Doc withdrawal tidak ditemukan');
    const d = snap.data();
    if(d.status!=='pending') throw new Error('Status bukan pending');

    await updateDoc(ref,{ status:'approved', approvedAt: serverTimestamp() });
    await addDoc(collection(db,'transactions'), {
      uid:d.uid, kind:'withdrawal_approved', withdrawalId:id, amount:+(d.amount||0), createdAt: serverTimestamp()
    });

    await Promise.all([loadWdPending(), loadHistoryAll()]);
  }catch(e){ console.error(e); toast('Gagal approve withdrawal.'); }
}
async function rejectWithdrawal(ev){
  const id = ev.target.closest('tr')?.dataset?.id;
  if(!id) return;
  try{
    await updateDoc(doc(db,'withdrawals',id), { status:'rejected', rejectedAt: serverTimestamp() });
    await Promise.all([loadWdPending(), loadHistoryAll()]);
  }catch(e){ console.error(e); toast('Gagal reject withdrawal.'); }
}
