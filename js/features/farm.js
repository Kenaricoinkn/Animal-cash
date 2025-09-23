// js/features/farm.js — versi kompatibel (tanpa optional chaining/comma operator)

// =================== Helpers =================== //
function $(sel, root) {
  return (root || document).querySelector(sel);
}
function $all(sel, root) {
  return Array.prototype.slice.call((root || document).querySelectorAll(sel));
}
function fmtRp(n, opt) {
  var base = { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 };
  if (opt) { for (var k in opt) base[k] = opt[k]; }
  return new Intl.NumberFormat('id-ID', base).format(Number(n || 0));
}
function toast(m) {
  try {
    if (window.App && window.App.toast) { window.App.toast(m); return; }
  } catch (e) {}
  alert(m);
}

// =================== Cloudinary (unsigned) =================== //
var CLOUD_NAME    = "dszl9phmt";     // <- punyamu
var UPLOAD_PRESET = "ml_default";    // <- unsigned preset
var UPLOAD_URL    = "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/upload";

// =================== Firebase =================== //
import {
  getFirestore, collection, addDoc, updateDoc, doc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// =============================================================
// PUBLIC API
// ============================================================= //
export function initFarm() {
  var farmTab = $('#farmTab');
  if (!farmTab) return;

  try {
    if (!window.App || !window.App.firebase) return;
  } catch (e) { return; }

  var auth = window.App.firebase.auth;
  var user = auth.currentUser;
  if (!user) return;

  // render saldo ringkas dari user doc kalau app-core menyiapkan API-nya
  try {
    var ensureUserDoc = window.App.firebase.ensureUserDoc;
    var onUserDoc     = window.App.firebase.onUserDoc;
    if (ensureUserDoc && onUserDoc) {
      ensureUserDoc(user.uid).then(function(){
        onUserDoc(user.uid, function (snap) {
          if (snap && snap.exists()) renderFarm(snap.data() || {});
        });
      })["catch"](function(err){
        console.error(err); toast('Gagal memuat Farm');
      });
    }
  } catch(e){ console.warn(e); }

  initFarmCards();
}

// =============================================================
// MARKETPLACE + MODAL QR
// ============================================================= //
export function initFarmCards() {
  // longgarkan selector agar pasti kena
  var cards = $all('.animal-card, .animal-card.v2, .market-card');
  if (!cards.length) return;

  // modal refs
  var modal     = $('#buyModal');
  var closeBt   = $('#closeBuy');
  var form      = $('#buyForm');
  var proofEl   = $('#proof');
  var nameEl    = $('#buyAnimal');
  var priceEl   = $('#buyPrice');
  var submitBtn = $('#buySubmit');
  var noteEl    = $('#buyNote');

  var auth = (window.App && window.App.firebase) ? window.App.firebase.auth : null;
  var db   = (window.App && window.App.firebase) ? (window.App.firebase.db || getFirestore()) : getFirestore();

  function showModal() {
    if (modal) { modal.classList.remove('hidden'); modal.style.display = 'flex'; }
  }
  function hideModal() {
    if (modal) { modal.classList.add('hidden'); modal.style.display = 'none'; }
  }

  var selected = null;

  // isi angka & pasang handler beli (tiap kartu)
  cards.forEach(function(card){
    var price    = Number(card.getAttribute('data-price') || 0);
    var daily    = Number(card.getAttribute('data-daily') || 0);
    var contract = Number(card.getAttribute('data-contract') || 0);
    var total    = daily * contract;

    var priceTarget = card.querySelector('.ac-price, .mc-price b');
    if (priceTarget) priceTarget.textContent = fmtRp(price);

    var dailyTarget = card.querySelector('.ac-daily, .mc-stat .mc-big');
    if (dailyTarget) dailyTarget.textContent = fmtRp(daily);

    var totalTarget = card.querySelector('.ac-total');
    if (totalTarget) totalTarget.textContent = fmtRp(total);

    var cycleTarget = card.querySelector('.ac-cycle, .mc-contract');
    if (cycleTarget) cycleTarget.textContent = contract + ' hari';

    function openModal() {
      var name = (card.getAttribute('data-animal') ||
                 (card.querySelector('.ac-title, .mc-title') ? card.querySelector('.ac-title, .mc-title').textContent : 'Item')
                ).toUpperCase();
      selected = { animal: name, price: price, daily: daily, days: contract };

      if (nameEl)  nameEl.textContent  = name;
      if (priceEl) priceEl.textContent = fmtRp(price);

      if (form) form.reset();
      if (submitBtn){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Kirim Bukti';
        submitBtn.classList.remove('bg-emerald-500','text-black','opacity-60','pointer-events-none');
      }
      if (noteEl){
        noteEl.classList.add('hidden');
        noteEl.textContent = '';
      }
      showModal();
    }

    var tBuy = card.querySelector('.buy-btn, .buy-btn-green, .btn-buy');
    if (tBuy) tBuy.addEventListener('click', openModal);

    var tData = card.querySelector('[data-buy]');
    if (tData) tData.addEventListener('click', openModal);
  });

  // Delegasi klik (kalau class tombol beda)
  document.addEventListener('click', function(ev){
    var t = ev.target.closest ? ev.target.closest('button, a, div, span') : null;
    if (!t) return;

    var text = (t.textContent || '').trim().toLowerCase();
    var isBuy = t.hasAttribute && t.hasAttribute('data-buy');
    if (!isBuy && t.matches) {
      isBuy = t.matches('.buy-btn, .buy-btn-green, .btn-buy');
    }
    if (!isBuy && text) {
      isBuy = /\bbeli\b/.test(text);
    }
    if (!isBuy) return;

    var card = t.closest ? t.closest('.animal-card, .animal-card.v2, .market-card') : null;
    if (!card) return;

    var btn = card.querySelector('.buy-btn, .buy-btn-green, .btn-buy, [data-buy]');
    if (btn) btn.dispatchEvent(new Event('click', { bubbles: true }));
  });

  if (closeBt) closeBt.addEventListener('click', hideModal);

  // Submit bukti → Cloudinary → update Firestore
  if (form) form.addEventListener('submit', function(ev){
    ev.preventDefault();

    var user = auth ? auth.currentUser : null;
    if (!user) { toast('Silakan login.'); return; }
    if (!selected || !selected.animal || !selected.price) { toast('Data produk tidak valid.'); return; }

    var file = proofEl && proofEl.files ? proofEl.files[0] : null;
    if (!file) {
      toast('Silakan unggah foto / bukti transfer dulu.');
      if (proofEl) {
        proofEl.classList.add('ring-2','ring-rose-400');
        setTimeout(function(){ proofEl.classList.remove('ring-2','ring-rose-400'); }, 1200);
      }
      return;
    }

    // state: loading
    if (submitBtn){
      submitBtn.disabled = true;
      submitBtn.textContent = 'Mengirim...';
      submitBtn.classList.add('opacity-60','pointer-events-none');
    }

    (async function(){
      try {
        // 1) create purchase pending
        var pRef = await addDoc(collection(db,'purchases'),{
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
        var fd = new FormData();
        fd.append('file', file);
        fd.append('upload_preset', UPLOAD_PRESET);
        var res  = await fetch(UPLOAD_URL, { method:'POST', body: fd });
        var json = await res.json();
        if (!json || !json.secure_url) throw new Error('Upload Cloudinary gagal');

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
          setTimeout(function(){
            noteEl.innerHTML = 'Sudah lebih dari 15 menit. Jika belum diproses, silakan hubungi admin.';
          }, 15 * 60 * 1000);
        }
        toast('Bukti terkirim. Menunggu verifikasi admin.');
      } catch(err){
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

// =============================================================
// Render saldo + metrik ringkas
// ============================================================= //
function renderFarm(obj) {
  var balance        = Number(obj && obj.balance != null ? obj.balance : 0).toFixed(2);
  var profitAsset    = Number(obj && obj.profitAsset || 0).toFixed(2);
  var earningToday   = String(obj && obj.earningToday != null ? obj.earningToday : 0);
  var totalIncome    = Number(obj && obj.totalIncome || 0).toFixed(2);
  var countableDays  = String(obj && obj.countableDays != null ? obj.countableDays : 210);
  var countdownDays  = String(obj && obj.countdownDays != null ? obj.countdownDays : 210);

  $all('.farm-balance').forEach(function(el){ el.textContent = balance; });

  var values = [profitAsset, earningToday, totalIncome, countableDays, countdownDays];
  $all('.metric-grid').forEach(function(grid){
    $all('.metric', grid).forEach(function(m, i){
      var v = m.querySelector('.metric-value');
      if (v && values[i] != null) v.textContent = values[i];
    });
  });
}
