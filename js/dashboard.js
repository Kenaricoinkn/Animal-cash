// js/dashboard.js — sinkron dengan dashboard.html (homePane + homeGrid)
(() => {
  // ---------- Helper: tunggu DOM & Firebase siap ----------
  const whenDOMReady = new Promise(res => {
    if (document.readyState !== 'loading') res();
    else document.addEventListener('DOMContentLoaded', res, { once: true });
  });

  const whenFirebase = new Promise(res => {
    if (window.App?.firebase) res();
    else window.addEventListener('firebase-ready', res, { once: true });
  });

  Promise.all([whenDOMReady, whenFirebase]).then(init).catch(console.error);

  async function init() {
    // ---------- Import modul opsional secara aman ----------
    let applyLang = () => {}, buildLanguageSheet = () => {};
    let initFarm = () => {}, initInvite = () => {}, initProfile = () => {};

    try {
      const m = await import('./i18n.js');
      applyLang = m.applyLang || applyLang;
      buildLanguageSheet = m.buildLanguageSheet || buildLanguageSheet;
    } catch {}

    try {
      const m = await import('./features/farm.js');
      initFarm = m.initFarm || initFarm;
    } catch {}

    try {
      const m = await import('./features/invite.js');
      initInvite = m.initInvite || initInvite;
    } catch {}

    try {
      const m = await import('./features/profile.js');
      initProfile = m.initProfile || initProfile;
    } catch {}

    // ---------- Auth guard ----------
    const { auth } = window.App.firebase;
    const gate = document.getElementById('gate');
    const app  = document.getElementById('app');

    const unsubAuth = auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = 'index.html';
        return;
      }
      gate?.classList.add('hidden');
      app?.classList.remove('hidden');

      try { initProfile(user); } catch {}
      try { initInvite(); }   catch {}
      try { initFarm(); }     catch {}

      applyInitialTab();
    });

    // ---------- Tabs logic ----------
    const tabBtns   = document.querySelectorAll('.tabbtn');

    // Home = 2 section terpisah
    const homePane  = document.querySelector('#homePane');  // ✅ sesuai HTML
    const homeGrid  = document.querySelector('#homeGrid');
    const farmTab   = document.querySelector('#farmTab');
    const inviteTab = document.querySelector('#inviteTab');
    const profileTab= document.querySelector('#profileTab');

    // Semua view
    const ALL_VIEWS = [homePane, homeGrid, farmTab, inviteTab, profileTab].filter(Boolean);

    // Mapping tab -> views
    const VIEWS_BY_TAB = {
      home:   [homePane, homeGrid],
      farm:   [farmTab],
      invite: [inviteTab],
      profile:[profileTab],
    };

    function showOnly(els) {
      ALL_VIEWS.forEach(el => {
        if (!el) return;
        el.classList.add('hidden');
      });
      els?.forEach(el => {
        el?.classList.remove('hidden');

        // efek fade ringan biar terasa “slide lembut”
        try {
          el.style.opacity = 0;
          el.style.transition = 'opacity .25s ease';
          requestAnimationFrame(() => { el.style.opacity = 1; });
        } catch {}
      });
    }

    function switchTab(tabKey) {
      tabBtns.forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tabKey));
      showOnly(VIEWS_BY_TAB[tabKey] || []);
      try { history.replaceState(null, '', `#${tabKey}`); } catch {}
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
    }

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Elemen lain yang punya [data-tab] (mis. item menu)
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (!t) return;
      const key = t.getAttribute('data-tab');
      if (!key) return;
      if (!t.classList.contains('tabbtn')) {
        e.preventDefault();
        switchTab(key);
      }
    });

    function applyInitialTab() {
      const hash = (location.hash || '').replace('#','');
      const first = ['home','farm','invite','profile'].includes(hash) ? hash : 'home';
      switchTab(first);
    }
    applyInitialTab();

    // ---------- Language sheet ----------
    const langSheet = document.querySelector('#langSheet');
    document.querySelector('#btnLanguage')?.addEventListener('click', () => {
      try { buildLanguageSheet(); } catch {}
      langSheet?.classList.remove('hidden');
    });
    langSheet?.querySelector('[data-close]')?.addEventListener('click', () => {
      langSheet?.classList.add('hidden');
    });
    try { applyLang(localStorage.getItem('lang') || 'id'); } catch {}

    // ---------- Optional logout ----------
    document.querySelector('#btnLogout')?.addEventListener('click', async () => {
      try { await auth.signOut(); } finally {
        unsubAuth?.();
        window.location.href = 'index.html';
      }
    });
  }
})();
