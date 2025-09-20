// js/features/invite.js
// Modul UI untuk tab Invite

export function initInvite() {
  const copyBtn = document.querySelector('#copyInvite');
  if (!copyBtn) return;

  copyBtn.addEventListener('click', () => {
    const input = document.querySelector('#inviteLink');
    const val = input?.value || '';
    if (val) {
      navigator.clipboard?.writeText(val);
      window.App?.toast ? window.App.toast('Tautan disalin') : alert('Tautan disalin');
    }
  });
}
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('inviteLink');
  if (!el) return;
  // otomatis pakai domain tempat situs dibuka
  const base = `${window.location.origin}/Animal-cash/invite/`;
  const code = 'ABC123'; // TODO: ganti/dinamis sesuai sistem kamu
  el.value = base + code;
});
