document.addEventListener("click",function(e){var a=e.target&&e.target.closest&&e.target.closest("a[rel=external]");if(a){return;}});
// helpers + tab switch (2 tab)
window.App = window.App || {};
(function(){
  const $   = (s)=>document.querySelector(s);
  const show=(el)=>el.classList.remove('hidden');
  const hide=(el)=>el.classList.add('hidden');
  const toast=(m)=>{
    const t=$('#toast'); if(!t) return;
    t.textContent=m; show(t); clearTimeout(window.__toast);
    window.__toast=setTimeout(()=>hide(t),2200);
  };
  // Tab in LOGIN
  const tabEmail=$('#tab-email'), tabPhone=$('#tab-phone');
  const formEmail=$('#form-email'), formPhone=$('#form-phone');
  if(tabEmail && tabPhone){
    tabEmail.onclick=()=>{ [tabEmail,tabPhone].forEach(b=>b.classList.remove('tab-active')); tabEmail.classList.add('tab-active'); hide(formPhone); show(formEmail); };
    tabPhone.onclick=()=>{ [tabEmail,tabPhone].forEach(b=>b.classList.remove('tab-active')); tabPhone.classList.add('tab-active'); hide(formEmail); show(formPhone); };
  }
  // Tab in REGISTER
  const tabRE=$('#tab-reg-email'), tabRP=$('#tab-reg-phone');
  const formRE=$('#form-reg-email'), formRP=$('#form-reg-phone');
  if(tabRE && tabRP){
    tabRE.onclick=()=>{ [tabRE,tabRP].forEach(b=>b.classList.remove('tab-active')); tabRE.classList.add('tab-active'); hide(formRP); show(formRE); };
    tabRP.onclick=()=>{ [tabRE,tabRP].forEach(b=>b.classList.remove('tab-active')); tabRP.classList.add('tab-active'); hide(formRE); show(formRP); };
  }
  window.App.$=$; window.App.show=show; window.App.hide=hide; window.App.toast=toast;
})();
