import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// firebase-init.js sudah menginisialisasi app di window.__FIREBASE_APP__
// kalau belum, fallback init singkat (AMAN kalau config-mu sudah benar)
const app = window.__FIREBASE_APP__ || initializeApp(window.__FIREBASE_CONFIG__);
const auth = getAuth(app);
const db   = getFirestore(app);

// Repo base untuk GitHub Pages
const REPO = "/Animal-cash";

function randomCode(n = 8) {
  const s = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let r = "";
  for (let i = 0; i < n; i++) r += s[Math.floor(Math.random() * s.length)];
  return r;
}

async function ensureReferralCode(uid) {
  // cache lokal biar cepat
  let code = localStorage.getItem("referralCode");
  if (code) return code;

  // cek Firestore
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists() && snap.data().referralCode) {
    code = snap.data().referralCode;
  } else {
    code = randomCode(10);
    await setDoc(ref, { referralCode: code }, { merge: true });
  }
  localStorage.setItem("referralCode", code);
  return code;
}

function setInviteLink(code) {
  const input = document.querySelector("#inviteLink");
  if (!input) return console.warn("[invite] #inviteLink tidak ditemukan.");
  const url = `${location.origin}${REPO}/invite/${code}`;
  input.value = url;
  console.log("[invite] set link:", url);
}

document.addEventListener("DOMContentLoaded", () => {
  // pastikan login siap
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      console.warn("[invite] belum login, pakai kode sementara");
      const code = localStorage.getItem("referralCode") || randomCode(10);
      localStorage.setItem("referralCode", code);
      setInviteLink(code);
      return;
    }
    const code = await ensureReferralCode(user.uid);
    setInviteLink(code);
  });
});
