// --- invite.v2.js (robust) ---
function randomCode(n=10){
  const s='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let r=''; for(let i=0;i<n;i++) r+=s[Math.floor(Math.random()*s.length)];
  return r;
}
function setInviteLink(code){
  const input = document.querySelector('#inviteLink');
  if(!input) { console.log('[invite] #inviteLink tidak ditemukan'); return; }
  const base = `${location.origin}/Animal-cash/invite/`;
  const url  = base + encodeURIComponent(code);
  // isi value + placeholder supaya nampak walau browser blokir programmatic value
  input.value = url;
  input.setAttribute('placeholder', url);
  console.log('[invite] set link =>', url);
}
function findCopyButton(){
  // 1) id eksplisit
  let btn = document.querySelector('#copyBtn');
  if (btn) return btn;
  // 2) tombol di kontainer yang sama dengan input
  const box = document.querySelector('#inviteLink')?.closest('div');
  btn = box?.querySelector('button');
  if (btn) return btn;
  // 3) fallback: tombol berteks “Salin”
  btn = Array.from(document.querySelectorAll('button'))
       .find(b => /salin/i.test(b.textContent||''));
  return btn || null;
}
function wireCopy(){
  const input = document.querySelector('#inviteLink');
  if(!input) return;
  const btn = findCopyButton();
  if(!btn){ console.log('[invite] Tombol Salin tidak ketemu'); return; }
  btn.addEventListener('click', async () => {
    const v = input.value || input.placeholder || '';
    if(!v){ alert('Link belum tersedia'); return; }
    try {
      await navigator.clipboard.writeText(v);
      alert('Tersalin!');
    } catch(e) {
      console.log('[invite] Clipboard gagal:', e);
      // fallback seleksi manual
      input.select?.(); input.setSelectionRange?.(0, 99999);
      alert('Silakan salin manual: ' + v);
    }
  }, { once:true });
}

document.addEventListener('DOMContentLoaded', () => {
  let code = localStorage.getItem('referralCode');
  if(!code){ code = randomCode(10); localStorage.setItem('referralCode', code); }
  setInviteLink(code);
  wireCopy();

  // kalau nanti app set window.__USER_REF_CODE__ setelah login
  if (window.__USER_REF_CODE__ && window.__USER_REF_CODE__ !== code) {
    localStorage.setItem('referralCode', window.__USER_REF_CODE__);
    setInviteLink(window.__USER_REF_CODE__);
  }
});
