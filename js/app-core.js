// window.App namespace + helpers + tabs
window.App = window.App || {};

(function () {
  const $ = (s) => document.querySelector(s);
  const show = (el) => el.classList.remove('hidden');
  const hide = (el) => el.classList.add('hidden');
  const toast = (msg) => {
    const t = $('#toast');
    t.textContent = msg; show(t);
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=>hide(t), 2200);
  };

  // Tab logic
const tabEmail = $('#tab-email');
const tabPhone = $('#tab-phone');
const formEmail = $('#form-email');
const formPhone = $('#form-phone');

function setActive(tab){
  [tabEmail, tabPhone].forEach(b=>b.classList.remove('tab-active'));
  tab.classList.add('tab-active');
}
function showPanel(panel){
  [formEmail, formPhone].forEach(h=>h.classList.add('hidden'));
  panel.classList.remove('hidden');
}

tabEmail.onclick = () => { setActive(tabEmail); showPanel(formEmail); };
tabPhone.onclick = () => { setActive(tabPhone); showPanel(formPhone); };
  // Expose helpers
  window.App.$ = $;
  window.App.show = show;
  window.App.hide = hide;
  window.App.toast = toast;
})();
