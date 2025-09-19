// js/dashboard.js
import { applyLang, buildLanguageSheet } from './i18n.js';

// Tunggu Firebase siap kalau belum ada
if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', init, { once: true });
} else {
  init();
}

function init() {
  const { auth } = window.App.firebase;

  // Cek login
  const unsubAuth = auth.onAuthStateChanged(user => {
    const gate = document.getElementById('gate');
    const app  = document.getElementById('app');

    if (!user) {
      // belum login -> balik ke halaman login
      window.location.href = 'index.html';
      return;
    }

    // Sudah login: tampilkan app, sembunyikan loader
    gate?.classList.add('hidden');
    app?.classList.remove('hidden');

    // isi profil
    const uidEl = document.querySelector('#uid');
    const whoEl = document.querySelector('#who');
    if (uidEl) uidEl.textContent = user.uid;
    if (whoEl) whoEl.textContent = user.email || user.displayName || '(user)';
  });

  // ---------- Tabs ----------
  const tabBtns    = document.querySelectorAll('.tabbtn');

  // Views/section yang perlu di-show/hide
  const homeHeader = document.querySelector('#homeHeader');   // <-- banner + kartu saldo
  const homeGrid   = document.querySelector('#homeGrid');     // menu ikon
  const farmTab    = document.querySelector('#farmTab');
  const inviteTab  = document.querySelector('#inviteTab');
  const profileTab = document.querySelector('#profileTab');

  // Kumpulan semua elemen konten yang harus bisa di-hide
  const ALL_VIEWS = [homeHeader, homeGrid, farmTab, inviteTab, profileTab].filter(Boolean);

  // Mapping tab -> elemen yang ditampilkan
  const VIEWS_BY_TAB = {
    home:   [homeHeader, homeGrid],
    farm:   [farmTab],
    invite: [inviteTab],
    profile:[profileTab],
  };

  function switchTab(tabKey) {
    // reset tombol
    tabBtns.forEach(b => b.classList.remove('tab-active'));
    // cari tombol yang sesuai & aktifkan
    const btn = [...tabBtns].find(b => b.dataset.tab === tabKey);
    btn?.classList.add('tab-active');

    // sembunyikan semua
    ALL_VIEWS.forEach(el => el?.classList.add('hidden'));
    // tampilkan yang perlu
    (VIEWS_BY_TAB[tabKey] || []).forEach(el => el?.classList.remove('hidden'));
  }

  // Event click tiap tombol
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Set default ke Home saat halaman dibuka
  switchTab('home');

  // ---------- Copy invite ----------
  document.querySelector('#copyInvite')?.addEventListener('click', () => {
    const val = document.querySelector('#inviteLink')?.value || '';
    if (val) navigator.clipboard?.writeText(val);
    window.App.toast?.('Tautan disalin');
  });

  // ---------- Language sheet ----------
  const langSheet = document.querySelector('#langSheet');
  document.querySelector('#btnLanguage')?.addEventListener('click', () => {
    buildLanguageSheet();
    langSheet?.classList.remove('hidden');
  });
  langSheet?.querySelector('[data-close]')?.addEventListener('click', () => {
    langSheet?.classList.add('hidden');
  });
  applyLang(localStorage.getItem('lang') || 'id');

  // ---------- Logout ----------
  document.querySelector('#btnLogout')?.addEventListener('click', async () => {
    try {
      await auth.signOut();
    } finally {
      unsubAuth?.();
      window.location.href = 'index.html';
    }
  });
}
