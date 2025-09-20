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
