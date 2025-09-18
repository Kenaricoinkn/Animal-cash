import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ---- GANTI DENGAN punyamu ----
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// ------------------------------

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'id';

// Mapping: +62 812-xxx -> 62812xxx@phone.user
const PHONE_EMAIL_DOMAIN = "phone.user";
function normalizePhone(phone){
  if(!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, '');
  const withCC  = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned; // remove +
  return withCC; // digits only
}
function phoneToEmail(phone){
  const digits = normalizePhone(phone);
  if(!digits) throw new Error('Nomor telepon tidak valid.');
  return `${digits}@${PHONE_EMAIL_DOMAIN}`;
}

window.App = window.App || {};
window.App.firebase = {
  auth,
  // EMAIL
  signInEmail: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
  signUpEmail : async (email, pass) => {
    const uc = await createUserWithEmailAndPassword(auth, email, pass);
    return uc;
  },
  // PHONE as email mapping
  signInPhonePass: (phone, pass) => {
    const email = phoneToEmail(phone);
    return signInWithEmailAndPassword(auth, email, pass);
  },
  signUpPhonePass: async (phone, pass) => {
    const email = phoneToEmail(phone);
    const uc = await createUserWithEmailAndPassword(auth, email, pass);
    // Simpan nomor ke displayName agar mudah dilihat di daftar user
    await updateProfile(uc.user, { displayName: `tel:${normalizePhone(phone)}` });
    return uc;
  }
};
