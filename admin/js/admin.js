// admin/js/admin.js
import {
  getAuth, onAuthStateChanged, signOut,
  RecaptchaVerifier, signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs,
  doc, updateDoc, increment, addDoc, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =================== CONFIG =================== */
// Kalau belum pakai custom claim admin, whitelist sementara UID di sini:
const FALLBACK_ADMIN_UIDS = [
  // "ZuUvoL3bDPNSLJ1ogTdcxXcb5Pi1", "UID_ADMIN_KAMU_2"
];

/* =================== HELPERS =================== */
const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const fmtRp = n => new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(Number(n||0));
const escapeHtml = (s='') => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toLocal = ts => { try { const d = ts?.toDate ? ts.toDate() : null; return d ? d.toLocaleString('id-ID') : '-'; } catch { return '-'; } };
const toast = m => alert(m);

// Hash PIN (SHA-256) untuk bandingkan dengan adminPinHash di Firestore
async function sha256Hex(text) {
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
const auth = window.App?.firebase?.auth || getAuth();
const db   = window.App?.firebase?.db   || getFirestore();

let recaptchaVerifier = null;
let confirmationResult = null;

/* =================== AUTH FLOW =================== */
// Init Recaptcha
function initRecaptcha() {
  if (recaptchaVerifier) return;
  recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha', {
    size: 'normal',
    callback: () => {},
    'expired-callback': () => {}
  });
}

btnSendOTP?.addEventListener('click', async ()=>{
  try {
    loginMsg.textContent = '';
    const phone = (phoneInput.value || '').trim();
    if (!/^\+?\d{8,15}$/.test(phone)) {
      loginMsg.textContent = 'Format nomor tidak valid. Gunakan +62...';
      return;
    }
    initRecaptcha();
    confirmationResult = await signInWithPhoneNumber(auth, phone, recaptchaVerifier);
    otpWrap.classList.remove('hidden');
    toast('OTP terkirim. Cek SMS.');
  } catch (e) {
    console.error(e);
    loginMsg.textContent = 'Gagal mengirim OTP. Coba lagi.';
  }
});

btnVerifyOTP?.addEventListener('click', async ()=>{
  try {
    loginMsg.textContent = '';
    const code = (otpInput.value || '').trim();
    if (!/^\d{6}$/.test(code)) {
      loginMsg.textContent = 'Kode OTP 6 digit.';
      return;
    }
    const cred = await confirmationResult.confirm(code);
    const user = cred.user;

    // ==== CEK ADMIN (claim / whitelist / users doc) ====
    const token = await user.getIdTokenResult();
    const isAdminClaim = !!token.claims?.admin;
    const isWhitelisted = FALLBACK_ADMIN_UIDS.includes(user.uid);

    // Users doc (untuk cek adminPinHash dan/atau flag isAdmin)
    const uref = doc(db, 'users', user.uid);
    const usnap = await getDoc(uref);
    const udata = usnap.exists() ? (usnap.data()||{}) : {};

    const isAdminFlag = !!udata.isAdmin || udata.role === 'admin';

    // OPSIONAL: verifikasi PIN jika diset di Firestore
    const storedHash = udata.adminPinHash || '';
    if (storedHash) {
      const pin = (pinInput.value || '').trim();
      if (!pin) {
        loginMsg.textContent = 'Masukkan PIN admin.';
        return;
      }
      const hash = await sha256Hex(pin);
      if (hash !== storedHash) {
        loginMsg.textContent = 'PIN salah.';
        return;
      }
    }
    // Jika pakai PIN Wajib untuk semua admin, tinggal jadikan syarat tanpa cek storedHash.

    if (!(isAdminClaim || isWhitelisted || isAdminFlag)) {
      gateBox.classList.remove('hidden');
      gateBox.innerHTML = `
        <div class="text-rose-300 font-semibold mb-2">Akses ditolak</div>
        <div class="text-slate-300 text-sm">Nomor ini tidak memiliki hak admin.</div>
      `;
      return;
    }

    // Sukses → tampilkan area admin
    loginCard.classList.add('hidden');
    adminArea.classList.remove('hidden');
    emailBox.textContent = user.phoneNumber || user.uid;

    await loadPurchPending();
    await loadWdPending();
    await loadHistoryAll();
  } catch (e) {
    console.error(e);
    loginMsg.textContent = 'Verifikasi gagal. Coba lagi.';
  }
});

// Logout
btnLogout?.addEventListener('click', async ()=>{
  await signOut(auth);
  location.reload();
});

// Jika user sudah login sebelumnya (persist), langsung cek akses
onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  try {
    const token = await user.getIdTokenResult();
    const isAdminClaim = !!token.claims?.admin;
    const isWhitelisted = FALLBACK_ADMIN_UIDS.includes(user.uid);
    const usnap = await getDoc(doc(db, 'users', user.uid));
    const udata = usnap.exists() ? (usnap.data()||{}) : {};
    const isAdminFlag = !!udata.isAdmin || udata.role === 'admin';

    if (isAdminClaim || isWhitelisted || isAdminFlag) {
      loginCard.classList.add('hidden');
      adminArea.classList.remove('hidden');
      emailBox.textContent = user.phoneNumber || user.uid;
      await loadPurchPending();
      await loadWdPending();
      await loadHistoryAll();
    }
  } catch (e) {
    console.error(e);
  }
});

/* =================== TABLE LOADERS =================== */

// Purchases Pending
async function loadPurchPending(){
  if (!tblPurchBody) return;
  tblPurchBody.innerHTML = `<tr><td colspan="7" class="py-3 text-slate-400">Memuat...</td></tr>`;

  const rows = [];
  try {
    const q1 = query(
      collection(db, 'purchases'),
      where('status','==','pending'),
      orderBy('createdAt','desc'),
      limit(50)
    );
    const snap = await getDocs(q1);
    snap.forEach(d=>{
      const v = d.data() || {};
      rows.push(renderPurchRow({
        id: d.id,
        time: toLocal(v.createdAt),
        uid: v.uid,
        item: `${v.animal || '-'} • harian ${fmtRp(v.daily||0)} • ${v.contractDays||0} hari`,
        price: v.price,
        proofUrl: v.proofUrl || '',
        status: v.status || 'pending'
      }));
    });
  } catch(e){ console.warn(e); }

  if (!rows.length) {
    tblPurchBody.innerHTML = `<tr><td colspan="7" class="py-3 text-slate-400">Tidak ada pending.</td></tr>`;
  } else {
    tblPurchBody.innerHTML = rows.join('');
    bindPurchActions(tblPurchBody);
  }
}

function renderPurchRow({id,time,uid,item,price,proofUrl,status}){
  const proof = proofUrl
    ? `<a href="${proofUrl}" target="_blank" class="text-sky-300 underline">Bukti</a>`
    : `<span class="opacity-60">—</span>`;
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
    </tr>
  `;
}

function bindPurchActions(scope){
  scope.querySelectorAll('.p-approve').forEach(b=>b.addEventListener('click', approvePurchase));
  scope.querySelectorAll('.p-reject').forEach(b=>b.addEventListener('click', rejectPurchase));
}

async function approvePurchase(e){
  try {
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id;
    if (!id) return;
    const ref = doc(db, 'purchases', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Doc tidak ditemukan.');
    const d = snap.data();
    if (d.status !== 'pending') throw new Error('Status bukan pending.');

    const uid   = d.uid;
    const price = Number(d.price || 0);

    // Bonus opsional
    let bonusPct = prompt('Bonus % (opsional):', '');
    let bonus = 0;
    if (bonusPct && !isNaN(bonusPct)) {
      bonusPct = Number(bonusPct);
      if (bonusPct > 0) bonus = Math.floor(price * (bonusPct/100));
    }

    await updateDoc(ref, { status: 'approved', bonusAmount: bonus||0, bonusGranted: (bonus>0) });

    await updateDoc(doc(db, 'users', uid), { balance: increment(price + (bonus||0)) });

    await addDoc(collection(db, 'transactions'), {
      uid, kind: 'purchase_approved', purchaseId: id, amount: price, bonus: bonus||0, createdAt: serverTimestamp()
    });

    await loadPurchPending();
    await loadHistoryAll();
  } catch (err) {
    console.error(err); toast('Gagal approve purchase.');
  }
}

async function rejectPurchase(e){
  try {
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id;
    if (!id) return;
    await updateDoc(doc(db,'purchases',id), { status: 'rejected' });
    await loadPurchPending();
    await loadHistoryAll();
  } catch (err) {
    console.error(err); toast('Gagal reject purchase.');
  }
}

// Withdrawals Pending
async function loadWdPending(){
  if (!tblWdBody) return;
  tblWdBody.innerHTML = `<tr><td colspan="6" class="py-3 text-slate-400">Memuat...</td></tr>`;

  const rows = [];
  try {
    const q2 = query(
      collection(db, 'withdrawals'),
      where('status','==','pending'),
      orderBy('createdAt','desc'),
      limit(50)
    );
    const snap = await getDocs(q2);
    snap.forEach(d=>{
      const v = d.data() || {};
      const tujuan = v.type === 'ewallet'
        ? `${v.provider || '-'} • ${v.number || '-'} • ${v.name || '-'}`
        : `${v.bank || '-'} • ${v.account || '-'} • ${v.owner || '-'}`;
      rows.push(renderWdRow({
        id: d.id,
        time: toLocal(v.createdAt),
        uid: v.uid,
        tujuan,
        amount: v.amount,
        status: v.status || 'pending'
      }));
    });
  } catch(e){ console.warn(e); }

  if (!rows.length) {
    tblWdBody.innerHTML = `<tr><td colspan="6" class="py-3 text-slate-400">Tidak ada pending.</td></tr>`;
  } else {
    tblWdBody.innerHTML = rows.join('');
    bindWdActions(tblWdBody);
  }
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
    </tr>
  `;
}

function bindWdActions(scope){
  scope.querySelectorAll('.w-approve').forEach(b=>b.addEventListener('click', approveWithdrawal));
  scope.querySelectorAll('.w-reject').forEach(b=>b.addEventListener('click', rejectWithdrawal));
}

async function approveWithdrawal(e){
  try {
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id;
    if (!id) return;
    const ref = doc(db, 'withdrawals', id);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Doc tidak ditemukan.');
    const d = snap.data();
    if (d.status !== 'pending') throw new Error('Status bukan pending.');

    const uid    = d.uid;
    const amount = Number(d.amount || 0);

    await updateDoc(ref, { status: 'approved' });
    await updateDoc(doc(db,'users',uid), { balance: increment(-amount) });
    await addDoc(collection(db,'transactions'), {
      uid, kind:'withdrawal_approved', withdrawalId:id, amount, createdAt: serverTimestamp()
    });

    await loadWdPending();
    await loadHistoryAll();
  } catch (err) {
    console.error(err); toast('Gagal approve withdrawal.');
  }
}

async function rejectWithdrawal(e){
  try {
    const tr = e.target.closest('tr'); const id = tr?.dataset?.id;
    if (!id) return;
    await updateDoc(doc(db,'withdrawals',id), { status: 'rejected' });
    await loadWdPending();
    await loadHistoryAll();
  } catch (err) {
    console.error(err); toast('Gagal reject withdrawal.');
  }
}

// Riwayat Gabungan
async function loadHistoryAll(){
  if (!tblAllBody) return;
  tblAllBody.innerHTML = `<tr><td colspan="6" class="py-3 text-slate-400">Memuat...</td></tr>`;

  const rows = [];

  // purchases (approved/rejected)
  try {
    const qp = query(
      collection(db,'purchases'),
      where('status','in',['approved','rejected']),
      orderBy('createdAt','desc'),
      limit(50)
    );
    const sp = await getDocs(qp);
    sp.forEach(d=>{
      const v = d.data()||{};
      const ref = v.proofUrl ? `<a href="${v.proofUrl}" target="_blank" class="text-sky-300 underline">Bukti</a>` : '—';
      rows.push(renderHist({
        time: toLocal(v.createdAt),
        jenis: 'Purchase',
        uid: v.uid,
        amount: v.price,
        ref,
        status: v.status
      }));
    });
  } catch(e){ console.warn(e); }

  // withdrawals (approved/rejected)
  try {
    const qw = query(
      collection(db,'withdrawals'),
      where('status','in',['approved','rejected']),
      orderBy('createdAt','desc'),
      limit(50)
    );
    const sw = await getDocs(qw);
    sw.forEach(d=>{
      const v = d.data()||{};
      const tujuan = v.type === 'ewallet'
        ? `${v.provider || '-'} • ${v.number || '-'}`
        : `${v.bank || '-'} • ${v.account || '-'}`;
      rows.push(renderHist({
        time: toLocal(v.createdAt),
        jenis: 'Withdrawal',
        uid: v.uid,
        amount: v.amount,
        ref: escapeHtml(tujuan),
        status: v.status
      }));
    });
  } catch(e){ console.warn(e); }

  if (!rows.length) {
    tblAllBody.innerHTML = `<tr><td colspan="6" class="py-3 text-slate-400">Belum ada riwayat.</td></tr>`;
  } else {
    tblAllBody.innerHTML = rows.join('');
  }
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
    </tr>
  `;
}
