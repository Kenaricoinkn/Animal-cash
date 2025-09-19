import { applyLang, buildLanguageSheet } from './i18n.js';

if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', init, { once:true });
} else {
  init();
}

function init(){
  const { auth } = window.App.firebase;
  const appEl  = document.querySelector('#app');
  const gateEl = document.querySelector('#gate');

  // auth guard
  const unsub = auth.onAuthStateChanged(user=>{
    if (!user) {
      window.location.replace('index.html');
      return;
    }
    // sudah login -> tampilkan app
    gateEl?.classList.add('hidden');
    appEl?.classList.remove('hidden');
    appEl?.classList.add('app-reveal');

    document.querySelector('#uid')?.replaceChildren(document.createTextNode(user.uid));
    document.querySelector('#who')?.replaceChildren(document.createTextNode(user.email || user.displayName || '(user)'));
  });

  /* ---------- Tabs ---------- */
  const tabBtns   = document.querySelectorAll('.tabbtn');
  const homeGrid  = document.querySelector('#homeGrid');
  const farmTab   = document.querySelector('#farmTab');
  const inviteTab = document.querySelector('#inviteTab');
  const profileTab= document.querySelector('#profileTab');

  const sections = { home: homeGrid, farm: farmTab, invite: inviteTab, profile: profileTab };

  tabBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      // reset semua button
      tabBtns.forEach(b=>b.classList.remove('tab-active'));
      btn.classList.add('tab-active');

      // sembunyikan semua section + reset anim
      Object.values(sections).forEach(s=>{
        s?.classList.add('hidden');
        s?.classList.remove('is-active');
      });

      // tampilkan tab target + animasi
      const key = btn.dataset.tab;
      const target = sections[key];
      if (target){
        target.classList.remove('hidden');
        void target.offsetWidth; // force reflow
        target.classList.add('is-active');
      }
    });
  });

  /* ---------- Copy invite ---------- */
  document.querySelector('#copyInvite')?.addEventListener('click', ()=>{
    const val = document.querySelector('#inviteLink')?.value || '';
    if (val) { navigator.clipboard?.writeText(val); window.App.toast?.('Tautan disalin'); }
  });

  /* ---------- Language sheet ---------- */
  const langSheet = document.querySelector('#langSheet');
  document.querySelector('#btnLanguage')?.addEventListener('click', ()=>{
    buildLanguageSheet(); langSheet?.classList.remove('hidden');
  });
  langSheet?.querySelector('[data-close]')?.addEventListener('click', ()=> langSheet?.classList.add('hidden'));
  applyLang(localStorage.getItem('lang') || 'id');
}
