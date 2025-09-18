// === Firebase Setup ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

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

// === UI Navigation ===
window.toggleMenu = function() {
  document.getElementById('sidebar').classList.toggle('active');
}

window.showPage = function(pageId) {
  let current = localStorage.getItem("currentUser");

  if (!current && !["login", "register"].includes(pageId)) {
    alert("Harus login dulu!");
    pageId = "login";
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (pageId === "profile") loadProfile();
  if (pageId === "farm") loadFarm();
}

// === Register ===
window.registerUser = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("reg-phone").value;
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
  const phone = document.getElementById("login-phone").value;
  const password = document.getElementById("login-password").value;
  const email = phone + "@peternakan.com";

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem("currentUser", userCred.user.uid);
    alert("Login berhasil!");
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
    document.getElementById("profile-username").textContent = data.phone;
    document.getElementById("profile-email").textContent = data.phone + "@peternakan.com";
    document.getElementById("profile-balance").textContent = data.balance.toLocaleString();
  }
}

// === Buy Animal ===
window.buyAnimal = async function(type) {
  const uid = localStorage.getItem("currentUser");
  if (!uid) return;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const user = snap.data();

  if (user.myFarm.find(a => a.name === type)) {
    alert("Hewan ini sudah dibeli!");
    return;
  }

  const konfirmasi = confirm(`Beli ${animals[type].label} seharga Rp ${animals[type].price.toLocaleString()}?`);
  if (!konfirmasi) return;

  const updatedFarm = [...user.myFarm, { name: type, income: animals[type].income }];
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
      if (user.myFarm.find(f => f.name === a)) {
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

  let total = user.myFarm.reduce((sum, a) => sum + a.income, 0);
  document.getElementById("farm-income").textContent = `Rp ${total.toLocaleString()} /hari`;

  let warn = document.getElementById("farm-warning");
  warn.style.display = user.myFarm.length === 0 ? "block" : "none";
  warn.textContent = "⚠️ Kamu belum membeli hewan!";
}

// === Withdraw ===
window.withdraw = async function() {
  const uid = localStorage.getItem("currentUser");
  if (!uid) return;

  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const user = snap.data();

  const pinInput = prompt("Masukkan kode keamanan:");
  if (pinInput !== user.pin) {
    alert("Kode keamanan salah!");
    return;
  }

  if (user.balance < 50000) {
    alert("Saldo tidak cukup!");
    return;
  }

  await updateDoc(doc(db, "users", uid), {
    balance: user.balance - 50000
  });

  alert("Penarikan berhasil!");
  loadProfile();
}

// === Logout ===
window.logout = async function() {
  await signOut(auth);
  localStorage.removeItem("currentUser");
  showPage("login");
}
