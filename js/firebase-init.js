// This file is a module because it imports Firebase from CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// =========================
// TODO: GANTI DENGAN punyamu
// =========================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
auth.languageCode = 'id';

// Setup invisible reCAPTCHA (for phone auth)
function initRecaptcha() {
  try {
    // container ada di index.html
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible' });
  } catch (e) {
    // ignore if already exists
  }
}
initRecaptcha();

// Expose minimal SDK to other files (no imports needed there)
window.App = window.App || {};
window.App.firebase = {
  auth,
  // email/password
  async signInEmail(email, password){
    return await signInWithEmailAndPassword(auth, email, password);
  },
  // phone OTP
  async sendOtp(phone){
    if (!window.recaptchaVerifier) initRecaptcha();
    const confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    window.App.__confirmationResult = confirmationResult;
    return confirmationResult;
  },
  async verifyOtp(code){
    const c = window.App.__confirmationResult;
    if (!c) throw new Error('Kirim kode terlebih dahulu.');
    return await c.confirm(code);
  }
};
