// === Firebase Setup ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYeFdMMjTesJUVf6iQS1lMBljSWeCfD58",
  authDomain: "peternakan-29e74.firebaseapp.com",
  projectId: "peternakan-29e74",
  storageBucket: "peternakan-29e74.firebasestorage.app",
  messagingSenderId: "1823968365",
  appId: "1:1823968365:web:aede4c3b7eaa93bc464364"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// === Global Data ===
const animals = {
  sapi: { price: 50000, income: 2000, label: "Sapi" },
  ayam: { price: 20000, income: 800, label: "Ayam" }
};

// === Helpers: persist current page ===
function setCurrentPage(pageId) {
  try { localStorage.setItem('currentPage', pageId); } catch(e) {}
}
function getStoredPage() {
  return localStorage.getItem('currentPage') || null;
}

// === UI Navigation ===
window.toggleMenu = function() {
  document.getElementById('sidebar').classList.toggle('active');
}

window.showPage = function(pageId) {
  // simpan page yang dipilih (persist)
  setCurrentPage(pageId);

  // cek user (dari localStorage atau auth)
  const storedUID = localStorage.getItem("currentUser");
  const authUID = auth.currentUser ? auth.currentUser.uid : null;
  const current = storedUID || authUID;

  // halaman publik yang boleh dibuka tanpa login
  const publicPages = ["login", "register"];

  if (!current && !publicPages.includes(pageId)) {
    // jika tidak ada user, paksa ke login
    pageId = "login";
  }

  // tampilkan page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');

  // tutup sidebar kalau terbuka
  const sb = document.getElementById('sidebar');
  if (sb) sb.classList.remove('active');

  // panggil loader yang relevan
  if (pageId === "profile") loadProfile();
  if (pageId === "farm") loadFarm();
}

// === Firebase Auth state handling ===
// Ketika auth berubah (login / logout / inisialisasi), kita set localStorage currentUser
onAuthStateChanged(auth, (user) => {
  if (user) {
    localStorage.setItem("currentUser", user.uid);

    // kalau user baru login, langsung ke home
    const page = getStoredPage() || "home";
    showPage(page);

  } else {
    localStorage.removeItem("currentUser");
    showPage("login");
  }
});

// === Register ===
window.registerUser = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("reg-phone").value.trim();
  const password = document.getElementById("reg-password").value;
  const pin = document.getElementById("reg-pin").value;

  try {
    const email = phone + "@peternakan.com";
    const userCred = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", userCred.user.uid), {
      phone,
      pin,
      balance: 0,
      myFarm: []
    });

    alert("Registrasi berhasil, silakan login!");
    showPage("login");
  } catch (err) {
    alert("Error: " + err.message);
  }
}

// === Login ===
window.loginUser = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value.trim();
  const password = document.getElementById("login-password").value;
  const email = phone + "@peternakan.com";

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);

    // Simpan UID ke localStorage
    localStorage.setItem("currentUser", userCred.user.uid);

    alert("Login berhasil!");

    // Paksa ke home setelah login
    showPage("home");

  } catch (err) {
    alert("Login gagal: " + err.message);
  }
}

// === Load Profile ===
window.loadProfile = async function() {
  const uid = localStorage.getItem("currentUser");
  if (!uid) return;

  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("profile-username").textContent = data.phone || "";
    document.getElementById("profile-email").textContent = (data.phone ? data.phone + "@peternakan.com" : "");
    document.getElementById("profile-balance").textContent = (data.balance || 0).toLocaleString();
  }
}

// === Buy Animal ===
window.buyAnimal = async function(type) {
  const uid = localStorage.getItem("currentUser");
  if (!uid) { alert("Harus login dulu!"); return; }

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const user = snap.data();

  if ((user.myFarm || []).find(a => a.name === type)) {
    alert("Hewan ini sudah dibeli!");
    return;
  }

  const konfirmasi = confirm(`Beli ${animals[type].label} seharga Rp ${animals[type].price.toLocaleString()}?`);
  if (!konfirmasi) return;

  const updatedFarm = [...(user.myFarm || []), { name: type, income: animals[type].income }];
  await updateDoc(doc(db, "users", uid), { myFarm: updatedFarm });

  alert(`Pembelian ${animals[type].label} berhasil!`);
  loadFarm();
}

// === Load Farm ===
window.loadFarm = async function() {
  const uid = localStorage.getItem("currentUser");
  if (!uid) return;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const user = snap.data();

  Object.keys(animals).forEach(a => {
    let btns = document.querySelectorAll(`button[onclick="buyAnimal('${a}')"]`);
    btns.forEach(btn => {
      if ((user.myFarm || []).find(f => f.name === a)) {
        btn.textContent = "Sudah Dibeli";
        btn.disabled = true;
        btn.style.background = "gray";
      } else {
        btn.textContent = "Beli";
        btn.disabled = false;
        btn.style.background = "#27ae60";
      }
    });
  });

  let total = (user.myFarm || []).reduce((sum, a) => sum + (a.income || 0), 0);
  document.getElementById("farm-income").textContent = `Rp ${total.toLocaleString()} /hari`;

  let warn = document.getElementById("farm-warning");
  warn.style.display = (user.myFarm || []).length === 0 ? "block" : "none";
  warn.textContent = "⚠️ Kamu belum membeli hewan!";
}

// === Withdraw ===
window.withdraw = async function() {
  const uid = localStorage.getItem("currentUser");
  if (!uid) { alert("Harus login dulu!"); return; }

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const user = snap.data();

  const pinInput = prompt("Masukkan kode keamanan:");
  if (pinInput !== user.pin) {
    alert("Kode keamanan salah!");
    return;
  }

  if ((user.balance || 0) < 50000) {
    alert("Saldo tidak cukup!");
    return;
  }

  await updateDoc(doc(db, "users", uid), {
    balance: (user.balance || 0) - 50000
  });

  alert("Penarikan berhasil!");
  loadProfile();
}

// === Logout ===
window.logout = async function() {
  try {
    await signOut(auth);
  } catch(e) {
    console.warn("SignOut error:", e);
  }
  try { localStorage.removeItem("currentUser"); } catch(e) {}
  showPage("login");
}
