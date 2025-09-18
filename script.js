// === Firebase Setup ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc,
  collection, addDoc, serverTimestamp, Timestamp
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

// === Data Hewan ===
const animals = {
  sapi: { price: 50000, income: 2000, label: "Sapi" },
  ayam: { price: 20000, income: 800, label: "Ayam" }
};

// === UI Nav ===
window.toggleMenu = function() {
  document.getElementById('sidebar').classList.toggle('active');
}
window.showPage = function(pageId) {
  localStorage.setItem('currentPage', pageId);
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById(pageId);
  if (el) el.classList.add('active');
  if (pageId === "profile") loadProfile();
  if (pageId === "farm") loadFarm();
  document.getElementById('sidebar').classList.remove('active');
}

// === Auth State ===
onAuthStateChanged(auth, (user) => {
  if (user) {
    localStorage.setItem("currentUser", user.uid);
    showPage(localStorage.getItem('currentPage') || "home");
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
      phone, pin, balance: 0, myFarm: [], role: "user"
    });
    alert("Registrasi berhasil, silakan login!");
    showPage("login");
  } catch (err) { alert("Error: " + err.message); }
}

// === Login ===
window.loginUser = async function(e) {
  e.preventDefault();
  const phone = document.getElementById("login-phone").value.trim();
  const password = document.getElementById("login-password").value;
  const email = phone + "@peternakan.com";

  try {
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    localStorage.setItem("currentUser", userCred.user.uid);
    alert("Login berhasil!");
    showPage("home");
  } catch (err) { alert("Login gagal: " + err.message); }
}

// === Load Profile ===
window.loadProfile = async function() {
  const uid = localStorage.getItem("currentUser");
  if (!uid) return;
  const snap = await getDoc(doc(db, "users", uid));
  if (snap.exists()) {
    const d = snap.data();
    document.getElementById("profile-username").textContent = d.phone;
    document.getElementById("profile-email").textContent = d.phone + "@peternakan.com";
    document.getElementById("profile-balance").textContent = (d.balance || 0).toLocaleString();
  }
}

// === Buy Animal (QR Payment) ===
window.buyAnimal = async function(type) {
  const uid = localStorage.getItem("currentUser");
  if (!uid) { alert("Harus login dulu!"); return; }

  const metode = prompt("Pilih metode pembayaran: DANA / GOPAY / MANDIRI")?.toUpperCase();
  if (!["DANA", "GOPAY", "MANDIRI"].includes(metode)) {
    alert("Metode pembayaran tidak valid!");
    return;
  }

  let qrUrl = "";
  if (metode === "DANA") qrUrl = "https://i.ibb.co/qr-dana.png";
  if (metode === "GOPAY") qrUrl = "https://i.ibb.co/qr-gopay.png";
  if (metode === "MANDIRI") qrUrl = "https://i.ibb.co/qr-mandiri.png";

  const trxRef = await addDoc(collection(db, "transactions"), {
    userId: uid,
    animal: type,
    amount: animals[type].price,
    method: metode,
    qrUrl,
    status: "pending",
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000))
  });

  const qrBox = document.getElementById("farm-summary");
  qrBox.innerHTML = `
    <h3>Pembayaran via ${metode}</h3>
    <p>Transfer Rp ${animals[type].price.toLocaleString()} ke admin</p>
    <img src="${qrUrl}" alt="QR ${metode}" style="max-width:200px; margin:10px 0;">
    <p><b>Catatan:</b> Setelah transfer, tunggu approval admin (1 jam s/d selesai).</p>
    <button onclick="confirmPayment('${trxRef.id}')">Saya sudah transfer</button>
  `;
  qrBox.scrollIntoView({ behavior: "smooth" });
}

// === Confirm Payment ===
window.confirmPayment = async function(trxId) {
  await updateDoc(doc(db, "transactions", trxId), {
    status: "waiting-approval"
  });
  alert("Konfirmasi berhasil, tunggu admin approve.");
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
    document.querySelectorAll(`button[onclick="buyAnimal('${a}')"]`)
      .forEach(btn => {
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
  document.getElementById("farm-warning").style.display = (user.myFarm || []).length === 0 ? "block" : "none";
}

// === Withdraw ===
window.withdraw = async function() {
  const uid = localStorage.getItem("currentUser");
  if (!uid) return;
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return;
  const user = snap.data();

  const pinInput = prompt("Masukkan kode keamanan:");
  if (pinInput !== user.pin) { alert("Kode salah!"); return; }
  if ((user.balance || 0) < 50000) { alert("Saldo tidak cukup!"); return; }

  await updateDoc(doc(db, "users", uid), { balance: user.balance - 50000 });
  alert("Penarikan berhasil!");
  loadProfile();
}

// === Logout ===
window.logout = async function() {
  await signOut(auth);
  localStorage.removeItem("currentUser");
  showPage("login");
}
