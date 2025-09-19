import { applyLang, buildLanguageSheet } from './i18n.js';

// guard: hanya user login yang boleh masuk
if (!window.App?.firebase) {
  window.addEventListener('firebase-ready', init, { once:true });
} else {
  init();
}

function init(){
  const { auth } = window.App.firebase;

  // redirect jika belum login + isi profil
  const unsub = auth.onAuthStateChanged(user=>{
    if (!user) { window.location.href = 'index.html'; return; }
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
      tabBtns.forEach(b=>b.classList.remove('tab-active'));
      btn.classList.add('tab-active');
      Object.values(sections).forEach(s=>s?.classList.add('hidden'));
      const key = btn.dataset.tab;
      sections[key]?.classList.remove('hidden');
    });
  });

  /* ---------- Copy invite ---------- */
  document.querySelector('#copyInvite')?.addEventListener('click', ()=>{
    const val = document.querySelector('#inviteLink')?.value || '';
    if (val) {
      navigator.clipboard?.writeText(val);
      window.App.toast?.('Tautan disalin');
    }
  });

  /* ---------- Language sheet ---------- */
  const langSheet = document.querySelector('#langSheet');
  document.querySelector('#btnLanguage')?.addEventListener('click', ()=>{
    buildLanguageSheet();
    langSheet?.classList.remove('hidden');
  });
  langSheet?.querySelector('[data-close]')?.addEventListener('click', ()=> langSheet?.classList.add('hidden'));
  applyLang(localStorage.getItem('lang') || 'id');

  /* ---------- (Opsional) Logout di tab "Aku"
     Kalau nanti kamu tambahkan tombol #btnLogout di profileTab, aktifkan:
     document.querySelector('#btnLogout')?.addEventListener('click', async ()=>{
       await auth.signOut(); unsub?.(); window.location.href = 'index.html';
     });
  --------------------------------------------------------------- */
}
