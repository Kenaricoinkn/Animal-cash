// admin/js/admin.js
import {
  getFirestore, collection, query, where, orderBy, limit, getDocs, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

(() => {
  const ADMIN_UIDS = ['ADMIN_UID_1','ADMIN_UID_2']; // GANTI dengan UID admin

  const { auth, db, updateUserDoc } = window.App.firebase;

  const tblPendingBody = document.querySelector('#tblPending tbody');
  const tblAllBody     = document.querySelector('#tblAll tbody');
  const gate           = document.getElementById('gate');
  const adminEmail     = document.getElementById('adminEmail');

  function toast(msg){ alert(msg); }

  // Auth guard: hanya admin
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      location.href = '../index.html';
      return;
    }
    adminEmail.textContent = user.email || user.uid;

    const isAdmin = ADMIN_UIDS.includes(user.uid);
    if (!isAdmin) {
      gate.classList.remove('hidden');
      gate.textContent = 'Akses ditolak. Akun ini bukan admin.';
      return;
    }

    // auto load
    await Promise.all([loadPending(), loadAll()]);
  });

  // Logout
  document.getElementById('btnLogout')?.addEventListener('click', async ()=>{
    await auth.signOut();
    location.href = '../index.html';
  });

  // Refresh buttons
  document.getElementById('btnRefreshPending')?.addEventListener('click', loadPending);
  document.getElementById('btnRefreshAll')?.addEventListener('click', loadAll);

  // ------ Loaders ------
  async function loadPending(){
    tblPendingBody.innerHTML = `<tr><td colspan="6" class="py-3 opacity-70">Memuat…</td></tr>`;
    const ref  = collection(db, 'topups');
    const q    = query(ref, where('status','==','pending'), orderBy('createdAt','desc'), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) {
      tblPendingBody.innerHTML = `<tr><td colspan="6" class="py-3 opacity-70">Tidak ada pending.</td></tr>`;
      return;
    }
    tblPendingBody.innerHTML = '';
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtTime(d.createdAt)}</td>
        <td class="font-mono text-xs">${d.uid || '-'}</td>
        <td>${fmtRp(d.amount)}</td>
        <td class="font-mono text-xs">${d.txid || '-'}</td>
        <td><span class="badge pending">pending</span></td>
        <td>
          <button class="action-btn approve" data-id="${docSnap.id}">Approve</button>
          <button class="action-btn reject" data-id="${docSnap.id}">Tolak</button>
        </td>
      `;
      tblPendingBody.appendChild(tr);
    });

    // Bind actions
    tblPendingBody.querySelectorAll('.approve').forEach(btn=>{
      btn.addEventListener('click', ()=> approveTopup(btn.dataset.id));
    });
    tblPendingBody.querySelectorAll('.reject').forEach(btn=>{
      btn.addEventListener('click', ()=> rejectTopup(btn.dataset.id));
    });
  }

  async function loadAll(){
    tblAllBody.innerHTML = `<tr><td colspan="5" class="py-3 opacity-70">Memuat…</td></tr>`;
    const ref  = collection(db, 'topups');
    const q    = query(ref, orderBy('createdAt','desc'), limit(50));
    const snap = await getDocs(q);
    if (snap.empty) {
      tblAllBody.innerHTML = `<tr><td colspan="5" class="py-3 opacity-70">Belum ada data.</td></tr>`;
      return;
    }
    tblAllBody.innerHTML = '';
    snap.forEach(docSnap=>{
      const d = docSnap.data();
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${fmtTime(d.createdAt)}</td>
        <td class="font-mono text-xs">${d.uid || '-'}</td>
        <td>${fmtRp(d.amount)}</td>
        <td class="font-mono text-xs">${d.txid || '-'}</td>
        <td>${badgeStatus(d.status || 'pending')}</td>
      `;
      tblAllBody.appendChild(tr);
    });
  }

  // ------ Actions ------
  async function approveTopup(id){
    if (!confirm('Setujui top-up ini dan tambahkan saldo user?')) return;
    const ref = doc(db, 'topups', id);
    // tandai approved
    await updateDoc(ref, { status:'approved', reviewedAt: serverTimestamp() });

    // opsional: tambah saldo user (coin) — pastikan kamu punya field saldo di users/{uid}
    // ambil data dulu untuk tahu uid & amount:
    // (biar hemat read, bisa juga sambil looping earlier; di sini simple dulu)
    // NOTE: untuk real production, pakai Cloud Functions agar atomic/aman.
    await loadPending();
    await loadAll();
    toast('Top-up disetujui ✔');
  }

  async function rejectTopup(id){
    if (!confirm('Tolak top-up ini?')) return;
    const ref = doc(db, 'topups', id);
    await updateDoc(ref, { status:'rejected', reviewedAt: serverTimestamp() });
    await loadPending();
    await loadAll();
    toast('Top-up ditolak ✖');
  }

  // ------ Helpers ------
  function fmtRp(n){ return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n||0)); }
  function fmtTime(ts){
    try {
      if (!ts) return '-';
      const d = ts.toDate ? ts.toDate() : new Date(ts.seconds ? ts.seconds*1000 : ts);
      return d.toLocaleString('id-ID');
    } catch { return '-'; }
  }
  function badgeStatus(s){
    const cls = s==='approved'?'approved':(s==='rejected'?'rejected':'pending');
    return `<span class="badge ${cls}">${s}</span>`;
  }
})();
