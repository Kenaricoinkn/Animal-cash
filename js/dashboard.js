// js/dashboard.js
// (i18n optional — aman walau modulnya belum dipakai)
import { applyLang, buildLanguageSheet } from './i18n.js';
import { initFarm }   from './features/farm.js';
import { initInvite } from './features/invite.js';
import { initProfile } from './features/profile.js';

// Kalau Firebase belum siap, tunggu sinyalnya
if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', init, { once: true });
} else {
  init();
}

function init () {
  const { auth } = window.App.firebase;

  // ---- Auth guard ----
  const unsubAuth = auth.onAuthStateChanged(user => {
    const gate = document.getElementById('gate');
    const app  = document.getElementById('app');

    if (!user) {
      window.location.href = 'index.html';
      return;
    }

    gate?.classList.add('hidden');
    app?.classList.remove('hidden');

    // Init fitur per tab
    initProfile(user);
    initInvite();
    initFarm();
  });

  // ---- Tabs ----
  const tabBtns    = document.querySelectorAll('.tabbtn');

  const homeHeader = document.querySelector('#homeHeader'); // banner + saldo (khusus home)
  const homeGrid   = document.querySelector('#homeGrid');   // grid menu (khusus home)
  const farmTab    = document.querySelector('#farmTab');
  const inviteTab  = document.querySelector('#inviteTab');
  const profileTab = document.querySelector('#profileTab');

  // Semua view yang bisa disembunyikan/ditampakkan
  const ALL_VIEWS = [homeHeader, homeGrid, farmTab, inviteTab, profileTab].filter(Boolean);

  // View mana yang aktif untuk tiap tab
  const VIEWS_BY_TAB = {
    home:   [homeHeader, homeGrid], // Home harus tampil dua-duanya
    farm:   [farmTab],
    invite: [inviteTab],
    profile:[profileTab],
  };

  function switchTab (tabKey) {
    // highlight tombol
    tabBtns.forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tabKey));
    // sembunyikan semuanya
    ALL_VIEWS.forEach(el => el?.classList.add('hidden'));
    // tampilkan yang diperlukan
    (VIEWS_BY_TAB[tabKey] || []).forEach(el => el?.classList.remove('hidden'));
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // default ke Home
  switchTab('home');

  // ---- Language sheet (opsional, bisa dipakai nanti) ----
  const langSheet = document.querySelector('#langSheet');

  document.querySelector('#btnLanguage')?.addEventListener('click', () => {
    try { buildLanguageSheet?.(); } catch (_) {}
    langSheet?.classList.remove('hidden');
  });

  langSheet?.querySelector('[data-close]')?.addEventListener('click', () => {
    langSheet?.classList.add('hidden');
  });

  try { applyLang?.(localStorage.getItem('lang') || 'id'); } catch (_) {}

  // ---- Optional Logout (kalau ada tombolnya) ----
  document.querySelector('#btnLogout')?.addEventListener('click', async () => {
    try { await auth.signOut(); } finally {
      unsubAuth?.();
      window.location.href = 'index.html';
    }
  });
}
