// js/features/farm.js — Cloudinary unsigned preset (FIXED + lock if owned)

/* =================== Helpers =================== */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const fmtRp = (n,opt={}) => new Intl.NumberFormat('id-ID',{
  style:'currency', currency:'IDR', maximumFractionDigits:0, ...opt
}).format(Number(n||0));
const toast = (m)=> window.App?.toast ? window.App.toast(m) : alert(m);
const daysBetween = (d1, d2)=> Math.floor((d2 - d1) / (24*60*60*1000));

/* =================== Cloudinary =================== */
const CLOUD_NAME    = "ddxezj8az";
const UPLOAD_PRESET = "Animalcash";
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

/* =================== Firebase =================== */
import {
  getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =================== Owned state =================== */
let OWNED = Object.create(null); // { COW: {active, contractDays, daily, purchasedAt}, ... }
let CURRENT_UID = null;

/* =========================================================================
 *  PUBLIC
 * ========================================================================= */
export function initFarm() {
  const farmTab = $('#farmTab');
  if (!farmTab || !window.App?.firebase) return;

  const { auth, ensureUserDoc, onUserDoc, db:dbFromApp } = window.App.firebase;
  const user = auth.currentUser;
  if (!user) return;

  CURRENT_UID = user.uid;

  // ringkasan di farm header
  const db = dbFromApp || getFirestore();
  ensureUserDoc(user.uid)
    .then(() => onUserDoc(user.uid, snap => snap.exists() && renderFarm(snap.data()||{})))
    .catch(e => { console.error(e); toast('Gagal memuat Farm'); });

  // dengarkan kepemilikan hewan user ⇒ kunci tombol beli
  const animalsRef = collection(db, 'users', user.uid, 'animals');
  onSnapshot(animalsRef, (snap)=>{
    OWNED = Object.create(null);
    snap.forEach(d=>{
      const v = d.data() || {};
      OWNED[d.id] = {
        active: !!v.active,
        contractDays: Number(v.contractDays||0),
        daily: Number(v.daily||0),
        purchasedAt: v.purchasedAt || v.createdAt || null
      };
    });
    refreshAllCardLocks();
  });

  initFarmCards();
}

/* =========================================================================
 *  MARKETPLACE + MODAL QR
 * ========================================================================= */
export function initFarmCards() {
  const cards = $$('.animal-card, .animal-card.v2, .market-card');
  if (!cards.length) return;

  // modal refs
  const modal     = $('#buyModal');
  const closeBt   = $('#closeBuy');
  const form      = $('#buyForm');
  const proofEl   = $('#proof');
  const nameEl    = $('#buyAnimal');
  const priceEl   = $('#buyPrice');
  const submitBtn = $('#buySubmit');
  const noteEl    = $('#buyNote');

  const auth = window.App?.firebase?.auth;
  const db   = window.App?.firebase?.db || getFirestore();

  const showModal = () => { if(modal){ modal.classList.remove('hidden'); modal.style.display='flex'; } };
  const hideModal = () => { if(modal){ modal.classList.add('hidden');   modal.style.display='none'; } };

  let selected = null;

  function canBuy(animalId){
    const info = OWNED[animalId];
    if (!info) return { ok:true };

    const start = info.purchasedAt?.toDate ? info.purchasedAt.toDate() : null;
    const remain = Math.max(0, Number(info.contractDays||0) - (start ? daysBetween(start, new Date()) : 0));
    if (info.active && remain > 0){
      return { ok:false, msg:`Anda sudah memiliki ${animalId}. Sisa ${remain} hari.` };
    }
    return { ok:true };
  }

  function openFromCard(card){
    const name     = (card.dataset.animal || card.querySelector('.ac-title, .mc-title')?.textContent || 'Item').toUpperCase();
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);

    const gate = canBuy(name);
    if (!gate.ok){ toast(gate.msg); return; }

    selected = { animal:name, price, daily, days:contract };

    if (nameEl)  nameEl.textContent  = name;
    if (priceEl) priceEl.textContent = fmtRp(price);

    form?.reset();
    if (submitBtn){
      submitBtn.disabled=false;
      submitBtn.textContent='Kirim Bukti';
      submitBtn.classList.remove('bg-emerald-500','text-black','opacity-60','pointer-events-none');
    }
    if (noteEl){
      noteEl.classList.add('hidden');
      noteEl.textContent='';
    }
    showModal();
  }

  // render angka & pasang handler beli (tiap kartu)
  cards.forEach(card=>{
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);
    const total    = daily * contract;

    let el;
    el = card.querySelector('.ac-price, .mc-price b');        if (el) el.textContent = fmtRp(price);
    el = card.querySelector('.ac-daily, .mc-stat .mc-big');    if (el) el.textContent = fmtRp(daily);
    el = card.querySelector('.ac-total, .mc-total');           if (el) el.textContent = fmtRp(total);
    el = card.querySelector('.ac-cycle, .mc-contract');        if (el) el.textContent = `${contract} hari`;

    // siapkan badge kepemilikan jika belum ada
    if (!card.querySelector('.owned-badge')){
      const badge = document.createElement('div');
      badge.className = 'owned-badge hidden text-xs text-emerald-300 mb-1';
      const head = card.querySelector('.ac-title, .mc-title')?.parentElement || card;
      head.insertBefore(badge, head.firstChild);
    }

    const btns = card.querySelectorAll('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]');
    btns.forEach(btn=>{
      if (btn.__hasFarmHandler) return;
      btn.__hasFarmHandler = true;
      btn.addEventListener('click', ()=> openFromCard(card));
    });
  });

  // delegation (kalau ada tombol yang dirender dinamis)
  document.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]');
    if (!btn || btn.__hasFarmHandler) return;
    const card = btn.closest('.animal-card, .animal-card.v2, .market-card');
    if (card) openFromCard(card);
  });

  closeBt?.addEventListener('click', hideModal);

  // Submit bukti → Cloudinary → purchase pending
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const user = auth?.currentUser;
    if (!user) return toast('Silakan login.');
    if (!selected?.animal || !selected?.price) return toast('Data produk tidak valid.');

    const file = proofEl?.files?.[0];
    if (!file) {
      toast('Silakan unggah foto / bukti transfer dulu.');
      if (proofEl){
        proofEl.classList.add('ring-2','ring-rose-400');
        setTimeout(()=>proofEl.classList.remove('ring-2','ring-rose-400'),1200);
      }
      return;
    }

    if (submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';
      submitBtn.classList.add('opacity-60','pointer-events-none');
    }

    try {
      // 1) Doc purchase pending
      const pRef = await addDoc(collection(db,'purchases'),{
        uid: (auth?.currentUser?.uid)||'-',
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
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);

      const res  = await fetch(UPLOAD_URL, { method:'POST', body: fd });
      const json = await res.json();
      if (!json.secure_url) throw new Error('Upload Cloudinary gagal');

      // 3) Simpan proofUrl
      await updateDoc(doc(db,'purchases', pRef.id), { proofUrl: json.secure_url });

      // 4) UI sukses
      if (submitBtn){
        submitBtn.disabled = true;
        submitBtn.textContent = 'Berhasil dikirim ✓';
        submitBtn.classList.remove('opacity-60','pointer-events-none');
        submitBtn.classList.add('bg-emerald-500','text-black');
      }
      if (noteEl){
        noteEl.classList.remove('hidden');
        noteEl.innerHTML = 'Bukti berhasil dikirim. Mohon tunggu persetujuan admin (maks <b>15 menit</b>).';
        setTimeout(()=>{ noteEl.innerHTML = 'Sudah lebih dari 15 menit. Jika belum diproses, silakan hubungi admin.'; }, 15*60*1000);
      }
      toast('Bukti terkirim. Menunggu verifikasi admin.');
    } catch(err){
      console.error(err);
      toast('Gagal mengirim bukti. Coba lagi.');
      if (submitBtn){
        submitBtn.disabled=false;
        submitBtn.textContent='Kirim Bukti';
        submitBtn.classList.remove('opacity-60','pointer-events-none','bg-emerald-500','text-black');
      }
    }
  });
}

/* =========================================================================
 *  Lock/Badge rendering berdasarkan kepemilikan
 * ========================================================================= */
function refreshAllCardLocks(){
  $$('.animal-card, .animal-card.v2, .market-card').forEach(card=>{
    const animalId = (card.dataset.animal || '').toUpperCase();
    const info = OWNED[animalId];
    const btn  = card.querySelector('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]');
    const badge= card.querySelector('.owned-badge');

    if (!btn) return;

    if (!info){
      btn.disabled = false;
      btn.textContent = 'Beli';
      btn.classList.remove('opacity-50','cursor-not-allowed');
      badge?.classList.add('hidden');
      return;
    }

    const start = info.purchasedAt?.toDate ? info.purchasedAt.toDate() : null;
    const remain = Math.max(0, Number(info.contractDays||0) - (start ? daysBetween(start, new Date()) : 0));

    if (info.active && remain > 0){
      btn.disabled = true;
      btn.textContent = 'Sudah dibeli';
      btn.classList.add('opacity-50','cursor-not-allowed');
      if (badge){
        badge.textContent = `Aktif • sisa ${remain} hari`;
        badge.classList.remove('hidden');
      }
    }else{
      btn.disabled = false;
      btn.textContent = 'Beli';
      btn.classList.remove('opacity-50','cursor-not-allowed');
      if (badge){
        if (info.contractDays && remain === 0){
          badge.textContent = 'Selesai. Bisa beli lagi';
          badge.classList.remove('hidden');
        }else{
          badge.classList.add('hidden');
        }
      }
    }
  });
}

/* =========================================================================
 *  Render saldo + metrik (header Farm)
 * ========================================================================= */
function renderFarm({
  balance=0, profitAsset=0, earningToday=0, totalIncome=0,
  countableDays=210, countdownDays=210
}={}) {
  $$('.farm-balance').forEach(el=> el.textContent = Number(balance).toFixed(2));
  const values = [
    Number(profitAsset).toFixed(2),
    String(earningToday),
    Number(totalIncome).toFixed(2),
    String(countableDays),
    String(countdownDays)
  ];
  $$('.metric-grid').forEach(grid=>{
    $$('.metric',grid).forEach((m,i)=>{
      const v = m.querySelector('.metric-value');
      if (v && values[i]!=null) v.textContent = values[i];
    });
  });
}
