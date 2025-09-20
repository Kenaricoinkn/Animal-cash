// daftar bahasa dan terjemahan dasar
const LANGS = [
  { code:'en', label:'English' },
  { code:'ar', label:'عربي' },
  { code:'fr', label:'Français' },
  { code:'it', label:'italiano' },
  { code:'ja', label:'日本' },
  { code:'ko', label:'한국인' },
  { code:'de', label:'Deutsch' },
  { code:'ru', label:'Русский' },
  { code:'vi', label:'Tiếng Việt' },
  { code:'pt', label:'Português (Portugal, Brasil)' },
  { code:'tr', label:'Türkçe' },
  { code:'es', label:'español' },
  { code:'fa', label:'فارسی' },
  { code:'id', label:'bahasa Indonesia', default:true },
  { code:'ms', label:'Melayu' },
  { code:'th', label:'ภาษาไทย' },
  { code:'bn', label:'বাংলা' },
  { code:'hi', label:'हिंदी' },
  { code:'ur', label:'اردو' },
  { code:'zh-Hant', label:'中文（繁體）' }
];

const STRINGS = {
  en: { home:'Home', farm:'Farm', invite:'Invite', me:'Me', total_asset:'Total assets', quant_acc:'Quantitative Account', topup:'Top up', withdraw:'Withdraw', help:'Help', team:'Team', activity:'Activity', inviteFriends:'Invite friends', inviteDesc:'Share your invite link to get bonuses.', agent:'Agent Partnership', news:'News', stake:'Stake', copy:'Copy', loginAs:'Logged in as' },
  id: { home:'Rumah', farm:'Farm', invite:'Mengundang teman', me:'Aku', total_asset:'Total aset', quant_acc:'Akun Kuantitatif', topup:'Isi ulang', withdraw:'Menarik', help:'Membantu', team:'Tim', activity:'Aktivitas', inviteFriends:'Mengundang teman-teman', inviteDesc:'Bagikan tautan undangan Anda untuk mendapatkan bonus.', agent:'Kerjasama Agen', news:'Berita', stake:'Stake', copy:'Salin', loginAs:'Masuk sebagai' },
  // tambahkan bahasa lain sesuai kebutuhan…
};

function getLang() {
  return localStorage.getItem('lang') || (LANGS.find(l=>l.default)?.code || 'id');
}
function setLang(code){
  localStorage.setItem('lang', code);
  applyLang(code);
  const item = LANGS.find(l=>l.code===code);
  const label = item ? item.label : code;
  document.querySelector('#langLabel')?.replaceChildren(document.createTextNode(label));
}
function applyLang(code){
  const dict = STRINGS[code] || STRINGS.id;
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
}

// sheet list
export function buildLanguageSheet() {
  const list = document.querySelector('#langList');
  const current = getLang();
  list.innerHTML = '';
  LANGS.forEach(l=>{
    const li = document.createElement('li');
    li.className = 'py-3 px-1 flex justify-between items-center';
    li.innerHTML = `<span>${l.label}</span>${l.code===current?'<span>✓</span>':''}`;
    li.addEventListener('click', ()=>{ setLang(l.code); document.querySelector('#langSheet')?.classList.add('hidden'); });
    list.appendChild(li);
  });
  setLang(current);
}

export { getLang, setLang, applyLang, LANGS };
