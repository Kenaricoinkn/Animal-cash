import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* =========================
   Firebase config (FINAL)
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyCYeFdMMjTesJUVf6iQS1lMBljSWeCfD58",
  authDomain: "peternakan-29e74.firebaseapp.com",
  projectId: "peternakan-29e74",
  storageBucket: "peternakan-29e74.firebasestorage.app",
  messagingSenderId: "1823968365",
  appId: "1:1823968365:web:aede4c3b7eaa93bc464364"
};

// Init
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'id';

/* =========================
   Phone → email mapping
   +62 812xxx => 62812xxx@phone.user
   ========================= */
const PHONE_EMAIL_DOMAIN = "phone.user";

function normalizePhone(phone){
  if(!phone) return "";
  const digits = phone.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits.slice(1) : digits;
}
function phoneToEmail(phone){
  const d = normalizePhone(phone);
  if(!d) throw new Error('Nomor telepon tidak valid.');
  return `${d}@${PHONE_EMAIL_DOMAIN}`;
}

/* =========================
   Expose helpers ke window.App
   ========================= */
window.App = window.App || {};
window.App.firebase = {
  auth,

  // EMAIL
  signInEmail: (email, pass) =>
    signInWithEmailAndPassword(auth, email, pass),

  signUpEmail: async (email, pass) => {
    const uc = await createUserWithEmailAndPassword(auth, email, pass);
    return uc;
  },

  // TELEPON (tanpa OTP) via email mapping
  signInPhonePass: (phone, pass) => {
    const email = phoneToEmail(phone);
    return signInWithEmailAndPassword(auth, email, pass);
  },

  signUpPhonePass: async (phone, pass) => {
    const email = phoneToEmail(phone);
    const uc = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(uc.user, { displayName: `tel:${normalizePhone(phone)}` });
    return uc;
  }
};

// Beri sinyal bahwa Firebase siap (untuk listener di register.js / index.js)
window.dispatchEvent(new CustomEvent('firebase-ready'));
