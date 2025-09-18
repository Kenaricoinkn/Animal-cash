import { db } from "./firebase.js";
import { doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// === Register ===
export async function registerUser(e) {
  e.preventDefault();
  const phone = document.getElementById("reg-phone").value;
  const password = document.getElementById("reg-password").value;
  const pin = document.getElementById("reg-pin").value;

  await setDoc(doc(db, "users", phone), {
    phone, password, pin, balance: 0, role: "user", createdAt: serverTimestamp()
  });

  alert("Registrasi berhasil!");
  document.getElementById("login").classList.add("active");
  document.getElementById("register").classList.remove("active");
}

// === Login ===
export async function loginUser(e) {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value;
  const password = document.getElementById("login-password").value;

  const snap = await getDoc(doc(db, "users", phone));
  if (!snap.exists()) { alert("User tidak ditemukan!"); return; }
  const data = snap.data();
  if (data.password !== password) { alert("Password salah!"); return; }

  localStorage.setItem("currentUser", phone);
  document.getElementById("profile-username").textContent = phone;
  document.getElementById("profile-email").textContent = phone + "@mail.com";
  document.getElementById("profile-balance").textContent = data.balance || 0;

  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("home").classList.add("active");
}

// === Logout ===
export function logout() {
  localStorage.removeItem("currentUser");
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("login").classList.add("active");
}
