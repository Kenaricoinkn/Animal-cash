// js/features/farm.js — Cloudinary unsigned preset (FIXED no-recursion)

/* =================== Helpers =================== */
const $  = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const fmtRp = (n,opt={}) => new Intl.NumberFormat('id-ID',{
  style:'currency', currency:'IDR', maximumFractionDigits:0, ...opt
}).format(Number(n||0));
const toast = (m)=> window.App?.toast ? window.App.toast(m) : alert(m);

/* =================== Cloudinary =================== */
const CLOUD_NAME    = "ddxezj8az";      // <- cloud name kamu
const UPLOAD_PRESET = "Animalcash";     // <- unsigned preset
const UPLOAD_URL    = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;

/* =================== Firebase =================== */
import {
  getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================================================================
 *  PUBLIC
 * ========================================================================= */
export function initFarm() {
  const farmTab = $('#farmTab');
  if (!farmTab || !window.App?.firebase) return;

  const { auth, ensureUserDoc, onUserDoc } = window.App.firebase;
  const user = auth.currentUser;
  if (!user) return;

  ensureUserDoc(user.uid)
    .then(() => onUserDoc(user.uid, snap => snap.exists() && renderFarm(snap.data()||{})))
    .catch(e => { console.error(e); toast('Gagal memuat Farm'); });

  initFarmCards();
}

/* =========================================================================
 *  MARKETPLACE + MODAL QR
 * ========================================================================= */
export function initFarmCards() {
  // longgarkan selector agar pasti kena
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

  // helper untuk buka modal dari kartu
  function openFromCard(card){
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);
    const name     = (card.dataset.animal || card.querySelector('.ac-title, .mc-title')?.textContent || 'Item').toUpperCase();

    selected = { animal:name, price, daily, days:contract };
    nameEl && (nameEl.textContent = name);
    priceEl && (priceEl.textContent = fmtRp(price));
    form?.reset();
    if (submitBtn){
      submitBtn.disabled=false;
      submitBtn.textContent='Kirim Bukti';
      submitBtn.classList.remove('bg-emerald-500','text-black','opacity-60','pointer-events-none');
    }
    noteEl && (noteEl.classList.add('hidden'), noteEl.textContent='');
    showModal();
  }

  // isi angka & pasang handler beli (tiap kartu)
  cards.forEach(card=>{
    const price    = Number(card.dataset.price || 0);
    const daily    = Number(card.dataset.daily || 0);
    const contract = Number(card.dataset.contract || 0);
    const total    = daily * contract;
    card.querySelector('.ac-price, .mc-price b')?.textContent = fmtRp(price);
    card.querySelector('.ac-daily, .mc-stat .mc-big')?.textContent = fmtRp(daily);
    card.querySelector('.ac-total')?.textContent = fmtRp(total);
    card.querySelector('.ac-cycle, .mc-contract')?.textContent = `${contract} hari`;

    // tombol yang umum
    card.querySelector('.buy-btn, .buy-btn-green, .btn-buy')?.addEventListener('click', ()=> openFromCard(card));
    // opsi: atribut data-buy (kalau ada)
    card.querySelector('[data-buy]')?.addEventListener('click', ()=> openFromCard(card));
  });

  /* ---------- SAFE delegation (tanpa re-dispatch) ----------
     Beberapa tema mungkin pakai tombol lain. Kita tangkap klik pada
     elemen yang mirip tombol BELI, lalu langsung panggil openFromCard()
     TANPA dispatch event "click" lagi (agar tidak rekursif). */
  document.addEventListener('click', (ev)=>{
    const btn = ev.target.closest('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]');
    if (!btn) return;
    // kalau tombolnya sudah punya handler di atas, biarkan handler itu jalan
    // handler di atas terpasang pada element dalam kartu; deteksi via flag
    if (btn.__hasFarmHandler) return;
    const card = btn.closest('.animal-card, .animal-card.v2, .market-card');
    if (card) openFromCard(card);
  });

  // tandai tombol yang sudah dipasang handlernya supaya delegation tidak dobel
  cards.forEach(card=>{
    card.querySelectorAll('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]')
        .forEach(el => el.__hasFarmHandler = true);
  });

  closeBt?.addEventListener('click', hideModal);

  // Submit bukti → Cloudinary → update Firestore
  form?.addEventListener('submit', async (ev)=>{
    ev.preventDefault();
    const user = auth?.currentUser;
    if (!user) return toast('Silakan login.');
    if (!selected?.animal || !selected?.price) return toast('Data produk tidak valid.');

    const file = proofEl?.files?.[0];
    if (!file) {
      toast('Silakan unggah foto / bukti transfer dulu.');
      proofEl?.classList.add('ring-2','ring-rose-400');
      setTimeout(()=>proofEl?.classList.remove('ring-2','ring-rose-400'),1200);
      return;
    }

    // state: loading
    if (submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';
      submitBtn.classList.add('opacity-60','pointer-events-none');
    }

    try {
      // 1) create purchase pending
      const pRef = await addDoc(collection(db,'purchases'),{
        uid: user.uid,
        animal: selected.animal,
        price: selected.price,
        daily: selected.daily,
        contractDays: selected.days,
        payMethod: 'QR_ADMIN',
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // 2) upload ke Cloudinary (unsigned)
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res  = await fetch(UPLOAD_URL, { method:'POST', body: fd });
      const json = await res.json();
      if (!json.secure_url) throw new Error('Upload Cloudinary gagal');

      // 3) simpan proofUrl
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
        noteEl.innerHTML = 'Bukti berhasil dikirim. Mohon tunggu persetujuan admin (maks <b>15 menit</b>). Jika lebih dari itu, silakan hubungi admin.';
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
 *  Render saldo + metrik
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
