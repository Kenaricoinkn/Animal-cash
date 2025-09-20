// js/features/profile.js
// Modul UI untuk tab Profil: menampilkan UID & siapa yang login

export function initProfile(user) {
  const uidEl = document.querySelector('#uid');
  const whoEl = document.querySelector('#who');
  if (!uidEl || !whoEl) return;

  uidEl.textContent = user?.uid || '—';
  whoEl.textContent = user?.email || user?.displayName || '(user)';
}
