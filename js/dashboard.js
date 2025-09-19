// js/dashboard.js — robust, sinkron, dan aman dari error kecil
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
      initFarm = m.initFarm || initFarm; // sudah include initFarmCards di dalamnya
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

      // Init fitur (jika modulnya tersedia)
      try { initProfile(user); } catch {}
      try { initInvite(); } catch {}
      try { initFarm(); } catch {}

      // Setelah login, pastikan tab default muncul benar
      applyInitialTab();
    });

    // ---------- Tabs logic ----------
    const tabBtns    = document.querySelectorAll('.tabbtn');

    const homeHeader = document.querySelector('#homeHeader'); // banner + saldo (khusus Home)
    const homeGrid   = document.querySelector('#homeGrid');   // grid ikon (khusus Home)
    const farmTab    = document.querySelector('#farmTab');
    const inviteTab  = document.querySelector('#inviteTab');
    const profileTab = document.querySelector('#profileTab');

    // Semua view yang bisa di-show/hide
    const ALL_VIEWS = [homeHeader, homeGrid, farmTab, inviteTab, profileTab].filter(Boolean);

    // View aktif per tab
    const VIEWS_BY_TAB = {
      home:   [homeHeader, homeGrid],
      farm:   [farmTab],
      invite: [inviteTab],
      profile:[profileTab],
    };

    function showOnly(els) {
      ALL_VIEWS.forEach(el => el?.classList.add('hidden'));
      els?.forEach(el => el?.classList.remove('hidden'));
    }

    function switchTab(tabKey) {
      // Update tombol aktif
      tabBtns.forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tabKey));
      // Tampilkan hanya view milik tab
      showOnly(VIEWS_BY_TAB[tabKey] || []);
      // Scroll ke atas supaya header tidak “tertinggal”
      try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { window.scrollTo(0, 0); }
      // Simpan di hash agar refresh tetap di tab yang sama
      try { history.replaceState(null, '', `#${tabKey}`); } catch {}
    }

    // Klik pada tombol tab bawah
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Delegasi: elemen lain yang punya [data-tab] (mis. item menu “Mengundang teman”)
    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-tab]');
      if (!t) return;
      const key = t.getAttribute('data-tab');
      if (!key) return;
      // Kalau elemen ini bukan tombol tab bar, tetap lakukan switch
      if (!t.classList.contains('tabbtn')) {
        e.preventDefault();
        switchTab(key);
      }
    });

    // Default ke tab dari hash atau 'home'
    function applyInitialTab() {
      const hash = (location.hash || '').replace('#','');
      const first = ['home','farm','invite','profile'].includes(hash) ? hash : 'home';
      switchTab(first);
    }
    applyInitialTab(); // juga berlaku bila user sudah login sebelum ini

    // ---------- Language sheet (opsional) ----------
    const langSheet = document.querySelector('#langSheet');
    document.querySelector('#btnLanguage')?.addEventListener('click', () => {
      try { buildLanguageSheet(); } catch {}
      langSheet?.classList.remove('hidden');
    });
    langSheet?.querySelector('[data-close]')?.addEventListener('click', () => {
      langSheet?.classList.add('hidden');
    });
    try { applyLang(localStorage.getItem('lang') || 'id'); } catch {}

    // ---------- Optional logout (kalau ada tombolnya) ----------
    document.querySelector('#btnLogout')?.addEventListener('click', async () => {
      try { await auth.signOut(); } finally {
        unsubAuth?.();
        window.location.href = 'index.html';
      }
    });
  }
})();
