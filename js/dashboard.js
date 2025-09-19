// js/dashboard.js
import { applyLang, buildLanguageSheet } from './i18n.js'; // i18n bisa dipakai nanti
import { initFarm, setFarmStats } from './features/farm.js';
import { initInvite } from './features/invite.js';
import { initProfile } from './features/profile.js';

// Tunggu Firebase siap kalau belum ada
if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', init, { once:true });
} else {
  init();
}

function init(){
  const { auth } = window.App.firebase;

  // Auth guard
  const unsubAuth = auth.onAuthStateChanged(user=>{
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

    // (Optional) kalau mau set angka farm dari backend nanti, panggil:
    // setFarmStats({ balance:'0.00', profitAsset:'0.00', earningToday:'0', totalIncome:'0.00', countableDays:'210', countdownDays:'210' });
  });

  // ---------- Tabs ----------
  const tabBtns    = document.querySelectorAll('.tabbtn');

  const homeHeader = document.querySelector('#homeHeader');
  const homeGrid   = document.querySelector('#homeGrid');
  const farmTab    = document.querySelector('#farmTab');
  const inviteTab  = document.querySelector('#inviteTab');
  const profileTab = document.querySelector('#profileTab');

  const ALL_VIEWS = [homeHeader, homeGrid, farmTab, inviteTab, profileTab].filter(Boolean);
  const VIEWS_BY_TAB = {
    home:   [homeHeader, homeGrid],
    farm:   [farmTab],
    invite: [inviteTab],
    profile:[profileTab],
  };

  function switchTab(tabKey) {
    tabBtns.forEach(b => b.classList.toggle('tab-active', b.dataset.tab===tabKey));
    ALL_VIEWS.forEach(el => el?.classList.add('hidden'));
    (VIEWS_BY_TAB[tabKey] || []).forEach(el => el?.classList.remove('hidden'));
  }

  tabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=> switchTab(btn.dataset.tab));
  });

  // Default ke Home
  switchTab('home');

  // ---------- Language sheet (aktifkan nanti kalau perlu) ----------
  const langSheet = document.querySelector('#langSheet');
  document.querySelector('#btnLanguage')?.addEventListener('click', ()=>{
    buildLanguageSheet();
    langSheet?.classList.remove('hidden');
  });
  langSheet?.querySelector('[data-close]')?.addEventListener('click', ()=> langSheet?.classList.add('hidden'));
  applyLang(localStorage.getItem('lang') || 'id');

  // ---------- Optional Logout (kalau tombolnya ada) ----------
  document.querySelector('#btnLogout')?.addEventListener('click', async ()=>{
    try{ await auth.signOut(); } finally {
      unsubAuth?.();
      window.location.href = 'index.html';
    }
  });
}
