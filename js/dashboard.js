import { applyLang, buildLanguageSheet } from './i18n.js';

if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', init, { once:true });
} else {
  init();
}

function init(){
  const { auth } = window.App.firebase;

  const gate = document.querySelector('#gate');
  const app  = document.querySelector('#app');

  const unsub = auth.onAuthStateChanged(user=>{
    if (!user) { window.location.href = 'index.html'; return; }
    document.querySelector('#uid').textContent = user.uid;
    document.querySelector('#who').textContent = user.email || user.displayName || '(user)';
    gate?.classList.add('hidden');
    app?.classList.remove('hidden');
  });

  // --- TAB HANDLER ---
  const tabBtns   = document.querySelectorAll('.tabbtn');

  const homeHeader = document.querySelector('#homeHeader');
  const homeGrid   = document.querySelector('#homeGrid');
  const farmTab    = document.querySelector('#farmTab');
  const inviteTab  = document.querySelector('#inviteTab');
  const profileTab = document.querySelector('#profileTab');

  // kini tiap tab bisa punya beberapa section
  const groups = {
    home:   [homeHeader, homeGrid],
    farm:   [farmTab],
    invite: [inviteTab],
    profile:[profileTab],
  };

  function showTab(key){
    // sembunyikan semua
    Object.values(groups).flat().forEach(el => el?.classList.add('hidden'));
    // tampilkan group yang dipilih
    (groups[key] || []).forEach(el => el?.classList.remove('hidden'));
    // state tombol
    tabBtns.forEach(b=>b.classList.toggle('tab-active', b.dataset.tab===key));
  }

  tabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=> showTab(btn.dataset.tab));
  });

  // tampilkan Home saat masuk
  showTab('home');

  // language & copy invite tetap seperti sebelumnya…
  document.querySelector('#copyInvite')?.addEventListener('click', ()=>{
    const val = document.querySelector('#inviteLink').value;
    navigator.clipboard?.writeText(val);
    window.App.toast?.('Tautan disalin');
  });

  const langSheet = document.querySelector('#langSheet');
  document.querySelector('#btnLanguage')?.addEventListener('click', ()=>{
    buildLanguageSheet();
    langSheet.classList.remove('hidden');
  });
  langSheet?.querySelector('[data-close]')?.addEventListener('click', ()=> langSheet.classList.add('hidden'));
  applyLang(localStorage.getItem('lang') || 'id');

  // logout (kalau ada tombolnya)
  document.querySelector('#btnLogout')?.addEventListener('click', async ()=>{
    await auth.signOut();
    unsub?.();
    window.location.href = 'index.html';
  });
}
