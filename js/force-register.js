(function () {
  function isDaftar(el){
    if(!el) return false;
    const t = (el.textContent||'').trim().toLowerCase();
    return t === 'daftar' || /(^|\s)daftar(\s|$)/.test(t);
  }
  function hook(el){
    if(!el || el.__forcedReg) return;
    el.__forcedReg = true;
    // jadikan anchor external
    if (el.tagName === 'A') {
      el.setAttribute('href','./register.html');
      el.setAttribute('rel','external');
    }
    el.addEventListener('click', function(e){
      e.preventDefault(); e.stopImmediatePropagation();
      try { window.location.href = './register.html'; }
      catch(_) { location.assign('./register.html'); }
    }, true); // capture: mendahului handler lain
  }

  function scan(){
    const candidates = Array.from(document.querySelectorAll('a,button,span,div'));
    candidates.forEach(el => { if (isDaftar(el)) hook(el); });
    // juga jika ada id/class yang jelas
    const byId = document.getElementById('gotoRegister');
    if (byId) hook(byId);
  }

  // jalankan saat siap
  if (document.readyState !== 'loading') scan();
  else document.addEventListener('DOMContentLoaded', scan);
})();
