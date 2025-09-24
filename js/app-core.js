// js/app-core.js  (module)
document.addEventListener("click", function (e) {
  const a = e.target && e.target.closest && e.target.closest("a[rel=external]");
  if (a) { return; }
});

// ===== Helpers + tab switch (2 tab) =====
window.App = window.App || {};
(function () {
  const $ = (s) => document.querySelector(s);
  const show = (el) => el && el.classList.remove("hidden");
  const hide = (el) => el && el.classList.add("hidden");
  const toast = (m) => {
    const t = $("#toast"); if (!t) return;
    t.textContent = m; show(t); clearTimeout(window.__toast);
    window.__toast = setTimeout(() => hide(t), 2200);
  };

  // Tab in LOGIN
  const tabEmail = $("#tab-email"), tabPhone = $("#tab-phone");
  const formEmail = $("#form-email"), formPhone = $("#form-phone");
  if (tabEmail && tabPhone) {
    tabEmail.onclick = () => { [tabEmail, tabPhone].forEach(b => b.classList.remove("tab-active")); tabEmail.classList.add("tab-active"); hide(formPhone); show(formEmail); };
    tabPhone.onclick = () => { [tabEmail, tabPhone].forEach(b => b.classList.remove("tab-active")); tabPhone.classList.add("tab-active"); hide(formEmail); show(formPhone); };
  }
  // Tab in REGISTER
  const tabRE = $("#tab-reg-email"), tabRP = $("#tab-reg-phone");
  const formRE = $("#form-reg-email"), formRP = $("#form-reg-phone");
  if (tabRE && tabRP) {
    tabRE.onclick = () => { [tabRE, tabRP].forEach(b => b.classList.remove("tab-active")); tabRE.classList.add("tab-active"); hide(formRP); show(formRE); };
    tabRP.onclick = () => { [tabRE, tabRP].forEach(b => b.classList.remove("tab-active")); tabRP.classList.add("tab-active"); hide(formRE); show(formRP); };
  }

  window.App.$ = $; window.App.show = show; window.App.hide = hide; window.App.toast = toast;
})();


// ===== Auth Guard: kontrol UI + persistence =====
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function initAuthGuard() {
  const fb = window.App?.firebase;
  if (!fb?.auth) return;

  const auth = fb.auth;
  const gate = document.getElementById("gate");
  const app  = document.getElementById("app");
  const loginCard = document.getElementById("loginCard"); // kalau ada di halaman login/admin

  // biar tetap login setelah refresh / reopen
  setPersistence(auth, browserLocalPersistence)
    .catch(() => setPersistence(auth, indexedDBLocalPersistence))
    .catch(() => { /* ignore */ });

  // UI ditentukan oleh status auth
  onAuthStateChanged(auth, (user) => {
    if (gate) gate.classList.add("hidden");
    if (user) {
      // sudah login → tampilkan app
      if (app) app.classList.remove("hidden");
      if (loginCard) loginCard.classList.add("hidden");
    } else {
      // belum login → sembunyikan app
      if (app) app.classList.add("hidden");
      if (loginCard) loginCard.classList.remove("hidden");
    }
  });
}

// Jalan setelah firebase-init siap
window.addEventListener("firebase-ready", initAuthGuard);
// Kalau firebase sudah ada duluan:
if (window.App?.firebase?.auth) initAuthGuard();
