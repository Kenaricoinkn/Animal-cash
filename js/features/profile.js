// js/features/profile.js
export function initProfile(user) {
  try {
    // UID
    const uidEl = document.getElementById('uid');
    if (uidEl) uidEl.textContent = user?.uid || '—';

    // Tampilkan hanya nomor:
    // Prioritas:
    // 1) displayName = "tel:<digits>"
    // 2) email yang di-map dari phone => "<digits>@phone.user"
    // 3) fallback ke email biasa
    let who = user?.email || '';
    const dn = (user?.displayName || '').trim();

    if (dn.startsWith('tel:')) {
      who = dn.slice(4);
    } else if (who.endsWith('@phone.user')) {
      who = who.replace('@phone.user', '');
    }

    const whoEl = document.getElementById('who');
    if (whoEl) whoEl.textContent = who || '—';
  } catch (e) {
    console.error('initProfile error', e);
  }
}
