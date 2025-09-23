// js/features/farm.js — versi kompatibel maksimum (mobile WebView friendly)

// =============== Helpers =============== //
function $(sel, root) { return (root || document).querySelector(sel); }
function $all(sel, root){ return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function fmtRp(n){
  var v = Number(n || 0);
  return new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(v);
}
function toast(m){
  try { if (window.App && window.App.toast) { window.App.toast(m); return; } } catch(e){}
  alert(m);
}

// =============== Cloudinary (unsigned) =============== //
var CLOUD_NAME    = "ddxezj8az";     // ← config barumu
var UPLOAD_PRESET = "Animalcash";    // ← config barumu
var UPLOAD_URL    = "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/upload";

// =============== Firebase =============== //
import {
  getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

var db  = null;
var authRef = null;

// =============== Public API =============== //
export function initFarm(){
  try{
    if (window.App && window.App.firebase){
      db = window.App.firebase.db || getFirestore();
      authRef = window.App.firebase.auth || null;
    }else{
      db = getFirestore();
    }
  }catch(e){
    db = getFirestore();
  }
}

export function initFarmCards(){
  var cards = $all('.market-card, .animal-card, .animal-card.v2');
  if (!cards.length) return;

  // Modal refs
  var modal     = $('#buyModal');
  var closeBtn  = $('#closeBuy');
  var form      = $('#buyForm');
  var proofEl   = $('#proof');
  var nameEl    = $('#buyAnimal');
  var priceEl   = $('#buyPrice');
  var submitBtn = $('#buySubmit');
  var noteEl    = $('#buyNote');

  function showModal(){ if(modal){ modal.classList.remove('hidden'); modal.style.display='flex'; } }
  function hideModal(){ if(modal){ modal.classList.add('hidden');   modal.style.display='none'; } }

  var selected = null;

  // Pasang handler di setiap kartu
  cards.forEach(function(card){
    var price    = Number(card.getAttribute('data-price') || 0);
    var daily    = Number(card.getAttribute('data-daily') || 0);
    var contract = Number(card.getAttribute('data-contract') || 0);
    var total    = daily * contract;

    var pEl = card.querySelector('.ac-price, .mc-price b');
    if (pEl) pEl.textContent = fmtRp(price);
    var dEl = card.querySelector('.ac-daily, .mc-stat .mc-big');
    if (dEl) dEl.textContent = fmtRp(daily);
    var tEl = card.querySelector('.ac-total');
    if (tEl) tEl.textContent = fmtRp(total);
    var cEl = card.querySelector('.ac-cycle, .mc-contract');
    if (cEl) cEl.textContent = String(contract) + " hari";

    function open(){
      var titleEl = card.querySelector('.ac-title, .mc-title');
      var nm = card.getAttribute('data-animal');
      if (!nm && titleEl) nm = titleEl.textContent;
      if (!nm) nm = "ITEM";
      nm = String(nm).toUpperCase();

      selected = { animal:nm, price:price, daily:daily, days:contract };

      if (nameEl)  nameEl.textContent  = nm;
      if (priceEl) priceEl.textContent = fmtRp(price);

      if (form) form.reset();
      if (submitBtn){
        submitBtn.disabled = false;
        submitBtn.textContent = "Kirim Bukti";
        submitBtn.classList.remove('bg-emerald-500','text-black','opacity-60','pointer-events-none');
      }
      if (noteEl){
        noteEl.classList.add('hidden');
        noteEl.textContent = "";
      }
      showModal();
    }

    var btn = card.querySelector('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]');
    if (btn) btn.addEventListener('click', open);
  });

  // Delegasi klik
  document.addEventListener('click', function(ev){
    var t = ev.target.closest ? ev.target.closest('button, a, div, span') : null;
    if (!t) return;
    var isBuy = false;
    try{
      if (t.matches('.buy-btn, .buy-btn-green, .btn-buy')) isBuy = true;
      if (!isBuy && t.hasAttribute && t.hasAttribute('data-buy')) isBuy = true;
      if (!isBuy){
        var txt = (t.textContent || '').toLowerCase();
        if (txt.indexOf('beli') >= 0) isBuy = true;
      }
    }catch(e){}
    if (!isBuy) return;

    var card = t.closest ? t.closest('.market-card, .animal-card, .animal-card.v2') : null;
    if (!card) return;
    var realBtn = card.querySelector('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]');
    if (realBtn) realBtn.dispatchEvent(new Event('click', {bubbles:true}));
  });

  if (closeBtn) closeBtn.addEventListener('click', hideModal);

  // Submit
  if (form) form.addEventListener('submit', function(ev){
    ev.preventDefault();

    try{
      if (!authRef || !authRef.currentUser){
        toast('Silakan login dahulu.');
        return;
      }
    }catch(e){
      toast('Silakan login dahulu.');
      return;
    }

    if (!selected || !selected.animal || !selected.price){
      toast('Data produk tidak valid.');
      return;
    }

    var file = (proofEl && proofEl.files && proofEl.files[0]) ? proofEl.files[0] : null;
    if (!file){
      toast('Silakan unggah foto / bukti transfer dulu.');
      try{
        proofEl.classList.add('ring-2','ring-rose-400');
        setTimeout(function(){ proofEl.classList.remove('ring-2','ring-rose-400'); }, 1200);
      }catch(e){}
      return;
    }

    if (submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';
      submitBtn.classList.add('opacity-60','pointer-events-none');
    }

    (async function(){
      try{
        // 1) create purchase
        var pRef = await addDoc(collection(db, 'purchases'), {
          uid: authRef.currentUser.uid,
          animal: selected.animal,
          price: selected.price,
          daily: selected.daily,
          contractDays: selected.days,
          payMethod: 'QR_ADMIN',
          status: 'pending',
          createdAt: serverTimestamp()
        });

        // 2) upload bukti
        var fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', UPLOAD_PRESET);

        var res = await fetch(UPLOAD_URL, { method:'POST', body: fd });
        var json = await res.json();
        if (!json || !json.secure_url) throw new Error('Upload Cloudinary gagal');

        // 3) update doc
        await updateDoc(doc(db, 'purchases', pRef.id), { proofUrl: json.secure_url });

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
        }
        toast('Bukti terkirim. Menunggu verifikasi admin.');
      }catch(err){
        console.error(err);
        toast('Gagal mengirim bukti. Coba lagi.');
        if (submitBtn){
          submitBtn.disabled = false;
          submitBtn.textContent = 'Kirim Bukti';
          submitBtn.classList.remove('opacity-60','pointer-events-none','bg-emerald-500','text-black');
        }
      }
    })();
  });
}
