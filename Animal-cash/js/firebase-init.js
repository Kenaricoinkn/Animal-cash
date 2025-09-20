/**
 * firebase-init.js (modular SDK)
 * NOTE: Isi config sesuai project Firebase kamu.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// TODO: GANTI dengan config project kamu
const firebaseConfig = {
  apiKey: "AIzaSyCYeFdMMjTesJUVf6iQS1lMBljSWeCfD58",
  authDomain: "peternakan-29e74.firebaseapp.com",
  projectId: "peternakan-29e74",
  storageBucket: "peternakan-29e74.firebasestorage.app",
  messagingSenderId: "1823968365",
  appId: "1:1823968365:web:aede4c3b7eaa93bc464364"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

export function onUser(cb){ return onAuthStateChanged(auth, cb); }
export async function loginWithGoogle(){ const p = new GoogleAuthProvider(); await signInWithPopup(auth, p); }
export async function logout(){ await signOut(auth); }

export { doc, getDoc, setDoc, runTransaction };
