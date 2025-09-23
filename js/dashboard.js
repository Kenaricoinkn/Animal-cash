// js/dashboard.js — robust init (no hard dependency on 'firebase-ready')
(() => {
  // ----- waiters -----
  const whenDOMReady = new Promise(res => {
    if (document.readyState !== 'loading') res();
    else document.addEventListener('DOMContentLoaded', res, { once: true });
  });

  // Tunggu sampai window.App.firebase benar-benar ada (polling)
  const whenFirebase = new Promise(res => {
    const tick = () => {
      if (window.App?.firebase?.auth && window.App?.firebase?.db) return res();
      setTimeout(tick, 40);
    };
    // kalau ada event 'firebase-ready', manfaatkan juga
    window.addEventListener?.('firebase-ready', () => res(), { once: true });
    tick();
  });

  Promise.all([whenDOMReady, whenFirebase]).then(init).catch(console.error);

  async function init() {
    // ---------- optional imports (diam kalau gagal) ----------
    let applyLang = () => {}, buildLanguageSheet = () => {};
    let initFarm = () => {}, initInvite = () => {}, initProfile = () => {}, initWithdraw = () => {};

    try {
      const m = await import('./i18n.js');
      applyLang = m.applyLang || applyLang;
      buildLanguageSheet = m.buildLanguageSheet || buildLanguageSheet;
    } catch {}

    try { const m = await import('./features/farm.js');      initFarm     = m.initFarm     || initFarm; }     catch {}
    try { const m = await import('./features/withdraw.js');  initWithdraw = m.initWithdraw || initWithdraw; } catch {}
    // invite: coba invite.js, kalau tidak ada jatuh ke invite.v2.js
    try {
      const m = await import('./features/invite.js');
      initInvite = m.initInvite || initInvite;
    } catch {
      try { const m2 = await import('./features/invite.v2.js'); initInvite = m2.initInvite || initInvite; } catch {}
    }
    try { const m = await import('./features/profile.js');   initProfile  = m.initProfile  || initProfile; }  catch {}

    // ---------- auth guard ----------
    const { auth } = window.App.firebase;
    const gate = document.getElementById('gate');
    const app  = document.getElementById('app');

    const unsub = auth.onAuthStateChanged(user => {
      if (!user) { location.href = 'index.html'; return; }

      gate?.classList.add('hidden');
      app?.classList.remove('hidden');

      try { initProfile(user); }  catch {}
      try { initInvite(); }       catch {}
      try { initFarm(); }         catch {}
      try { initWithdraw(); }     catch {}

      applyInitialTab();
    });

    // ---------- tabbing ----------
    const tabBtns     = document.querySelectorAll('.tabbtn');
    const homeHeader  = document.querySelector('#homeHeader');
    const homeGrid    = document.querySelector('#homeGrid');
    const farmTab     = document.querySelector('#farmTab');
    const inviteTab   = document.querySelector('#inviteTab');
    const withdrawTab = document.querySelector('#withdrawTab');
    const profileTab  = document.querySelector('#profileTab');

    const ALL_VIEWS = [homeHeader, homeGrid, farmTab, inviteTab, withdrawTab, profileTab].filter(Boolean);
    const VIEWS_BY_TAB = {
      home:    [homeHeader, homeGrid],
      farm:    [farmTab],
      invite:  [inviteTab],
      withdraw:[withdrawTab],
      profile: [profileTab],
    };

    function showOnly(els) {
      ALL_VIEWS.forEach(el => el?.classList.add('hidden'));
      els?.forEach(el => {
        el?.classList.remove('hidden');
        try {
          el.style.opacity = 0;
          el.style.transition = 'opacity .2s ease';
          requestAnimationFrame(() => { el.style.opacity = 1; });
        } catch {}
      });
    }

    function switchTab(key) {
      tabBtns.forEach(b => b.classList.toggle('tab-active', b.dataset.tab === key));
      showOnly(VIEWS_BY_TAB[key] || []);
      try { history.replaceState(null, '', `#${key}`); } catch {}
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
    }

    tabBtns.forEach(btn => btn.addEventListener('click', () => switchTab(btn.dataset.tab)));

    document.addEventListener('click', (e) => {
      const t = e.target.closest?.('[data-tab]');
      if (!t || t.classList.contains('tabbtn')) return;
      e.preventDefault();
      switchTab(t.getAttribute('data-tab'));
    });

    function applyInitialTab() {
      const hash = (location.hash || '').slice(1);
      const first = ['home','farm','invite','withdraw','profile'].includes(hash) ? hash : 'home';
      switchTab(first);
    }

    // ---------- language sheet ----------
    const langSheet = document.querySelector('#langSheet');
    document.querySelector('#btnLanguage')?.addEventListener('click', () => {
      try { buildLanguageSheet(); } catch {}
      langSheet?.classList.remove('hidden');
    });
    langSheet?.querySelector('[data-close]')?.addEventListener('click', () => langSheet?.classList.add('hidden'));
    try { applyLang(localStorage.getItem('lang') || 'id'); } catch {}

    // ---------- optional logout ----------
    document.querySelector('#btnLogout')?.addEventListener('click', async () => {
      try { await auth.signOut(); } finally { unsub?.(); location.href = 'index.html'; }
    });
  }
})();
