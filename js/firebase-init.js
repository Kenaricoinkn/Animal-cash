// js/firebase-init.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  indexedDBLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

/* =========================
   Firebase config
   ========================= */
const firebaseConfig = {
  apiKey: "AIzaSyCYeFdMMjTesJUVf6iQS1lMBljSWeCfD58",
  authDomain: "peternakan-29e74.firebaseapp.com",
  projectId: "peternakan-29e74",
  // (opsional untuk Storage, tidak mempengaruhi auth/login)
  storageBucket: "peternakan-29e74.appspot.com",
  messagingSenderId: "1823968365",
  appId: "1:1823968365:web:aede4c3b7eaa93bc464364",
};

// Init core SDK
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
auth.languageCode = "id";

/* =========================
   Persistensi sesi (tetap login)
   ========================= */
// top-level await aman karena file ini module (type="module")
try {
  await setPersistence(auth, browserLocalPersistence);
} catch (e1) {
  try {
    await setPersistence(auth, indexedDBLocalPersistence);
  } catch (e2) {
    console.warn("[Auth persistence] gagal set:", e1, e2);
  }
}

/* =========================
   Phone → email mapping
   ========================= */
const PHONE_EMAIL_DOMAIN = "phone.user";
function normalizePhone(phone = "") {
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits.slice(1) : digits;
}
function phoneToEmail(phone) {
  const d = normalizePhone(phone);
  if (!d) throw new Error("Nomor telepon tidak valid.");
  return `${d}@${PHONE_EMAIL_DOMAIN}`;
}

/* =========================
   Firestore helpers (Farm)
   ========================= */
function userDocRef(uid) {
  return doc(db, "users", uid);
}

const DEFAULT_FARM = {
  balance:        0.0,
  profitAsset:    0.0,
  earningToday:   0,
  totalIncome:    0.0,
  countableDays:  210,
  countdownDays:  210,
  updatedAt:      serverTimestamp(),
};

async function ensureUserDoc(uid, extra = {}) {
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
  updateUserDoc: (uid, data) =>
    updateDoc(userDocRef(uid), { ...data, updatedAt: serverTimestamp() }),

  // EMAIL
  signInEmail: (email, pass) => signInWithEmailAndPassword(auth, email, pass),
  signUpEmail: async (email, pass) => {
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
  },
};

// Sinyal siap (opsional untuk listener lain)
window.dispatchEvent(new CustomEvent("firebase-ready"));
