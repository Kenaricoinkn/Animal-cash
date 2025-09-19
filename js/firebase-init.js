// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db   = getFirestore(app);
auth.languageCode = 'id';

/* =========================
   Phone → email mapping
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
   Firestore helpers (Farm)
   ========================= */
// path: users/{uid}
function userDocRef(uid){
  return doc(db, 'users', uid);
}

// nilai default saat pertama kali login
const DEFAULT_FARM = {
  balance:        0.00,
  profitAsset:    0.00,
  earningToday:   0,
  totalIncome:    0.00,
  countableDays:  210,
  countdownDays:  210,
  updatedAt:      serverTimestamp()
};

// create doc kalau belum ada
async function ensureUserDoc(uid, extra={}) {
  const ref = userDocRef(uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { ...DEFAULT_FARM, ...extra });
  }
  return ref;
}

/* =========================
   Expose ke window.App
   ========================= */
window.App = window.App || {};
window.App.firebase = {
  auth,
  db,

  // Firestore farm api
  userDocRef,
  ensureUserDoc,
  onUserDoc: (uid, cb) => onSnapshot(userDocRef(uid), cb),
  updateUserDoc: (uid, data) => updateDoc(userDocRef(uid), { ...data, updatedAt: serverTimestamp() }),

  // EMAIL
  signInEmail: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
  signUpEmail : async (email, pass) => {
    const uc = await createUserWithEmailAndPassword(auth, email, pass);
    return uc;
  },

  // PHONE as email mapping (tanpa OTP)
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

// sinyal siap
window.dispatchEvent(new CustomEvent('firebase-ready'));
