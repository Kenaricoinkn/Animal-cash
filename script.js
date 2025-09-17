// === MENU & NAVIGATION ===
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('active');
}

function showPage(pageId) {
  if (!localStorage.getItem("currentUser") && 
      !["login", "register", "forgot"].includes(pageId)) {
    pageId = "login";
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.getElementById('sidebar').classList.remove('active');
  if (pageId === "profile") loadProfile();
  if (pageId === "farm") loadFarm();
}

// === SLIDER ===
let currentSlide = 0;
function showSlide(index) {
  const slides = document.querySelectorAll(".slide");
  if (slides.length === 0) return;
  document.querySelector(".slides").style.transform = `translateX(-${index * 100}%)`;
}
function nextSlide() {
  const slides = document.querySelectorAll(".slide");
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}
setInterval(nextSlide, 4000);

// === DATA HEWAN ===
const animals = [
  { name: "Sapi", price: 100000, earning: 5000, duration: "30 hari" },
  { name: "Ayam", price: 50000, earning: 2000, duration: "20 hari" },
  { name: "Kucing", price: 20000, earning: 1000, duration: "15 hari" },
  { name: "Domba", price: 80000, earning: 3500, duration: "25 hari" },
  { name: "Gajah", price: 200000, earning: 10000, duration: "40 hari" }
];

// === REGISTER ===
function registerUser(e) {
  e.preventDefault();
  let email = document.getElementById("reg-email").value;
  let username = document.getElementById("reg-username").value;
  let password = document.getElementById("reg-password").value;
  let pin = document.getElementById("reg-pin").value;

  let users = JSON.parse(localStorage.getItem("users")) || [];
  if (users.find(u => u.username === username)) {
    alert("Username sudah terdaftar!");
    return;
  }

  users.push({ email, username, password, pin, balance: 0, myFarm: [] });
  localStorage.setItem("users", JSON.stringify(users));
  alert("Registrasi berhasil, silakan login!");
  showPage("login");
}

// === LOGIN ===
function loginUser(e) {
  e.preventDefault();
  let username = document.getElementById("login-username").value;
  let password = document.getElementById("login-password").value;

  let users = JSON.parse(localStorage.getItem("users")) || [];
  let user = users.find(u => u.username === username && u.password === password);

  if (user) {
    localStorage.setItem("currentUser", username);
    alert("Login berhasil!");
    showPage("home");
  } else {
    alert("Username atau password salah!");
  }
}

// === RESET PASSWORD ===
function resetPassword(e) {
  e.preventDefault();
  let username = document.getElementById("forgot-username").value;
  let newPass = document.getElementById("forgot-newpass").value;

  let users = JSON.parse(localStorage.getItem("users")) || [];
  let user = users.find(u => u.username === username);

  if (!user) {
    alert("Username tidak ditemukan!");
    return;
  }
  user.password = newPass;
  localStorage.setItem("users", JSON.stringify(users));
  alert("Password berhasil direset, silakan login!");
  showPage("login");
}

// === PROFIL ===
function loadProfile() {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  if (user) {
    document.getElementById("profile-username").textContent = user.username;
    document.getElementById("profile-email").textContent = user.email;
    document.getElementById("profile-balance").textContent = user.balance.toLocaleString();
  }
}

// === FARM ===
function loadFarm() {
  let tbody = document.getElementById("farm-data");
  tbody.innerHTML = "";
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  let total = 0;
  animals.forEach((a, i) => {
    let owned = user.myFarm && user.myFarm.some(f => f.name === a.name);
    if (owned) total += a.earning;
    let row = document.createElement("tr");
    row.innerHTML = `
      <td>${a.name}</td>
      <td>Rp ${a.price.toLocaleString()}</td>
      <td>Rp ${a.earning.toLocaleString()}</td>
      <td>${a.duration}</td>
      <td>${owned ? "Sudah Dibeli" : `<button onclick="buyAnimal(${i})">Beli</button>`}</td>
    `;
    tbody.appendChild(row);
  });
  document.getElementById("total-earnings").textContent = "Total Penghasilan: Rp " + total.toLocaleString() + " /hari";
}

// === BELI HEWAN ===
function buyAnimal(index) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);
  if (!user) return;

  let animal = animals[index];
  if (user.myFarm && user.myFarm.some(f => f.name === animal.name)) {
    alert("Anda sudah membeli hewan ini!");
    return;
  }

  let metode = prompt("Pilih metode pembayaran: Dana / OVO").toLowerCase();
  if (metode !== "dana" && metode !== "ovo") {
    alert("Metode tidak valid!");
    return;
  }

  let qrLink = (metode === "dana") 
    ? "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=NomorDanaAdmin"
    : "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=NomorOVOAdmin";

  document.getElementById("payment-qr").innerHTML = `
    <h3>Scan QR ${metode.toUpperCase()} untuk bayar Rp ${animal.price.toLocaleString()}</h3>
    <img src="${qrLink}" alt="QR ${metode}" style="margin:10px 0;"/>
    <button onclick="confirmPayment(${index}, '${metode}')">Saya Sudah Transfer</button>
  `;
}

function confirmPayment(index, metode) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);
  if (!user) return;

  let animal = animals[index];
  user.myFarm.push(animal);
  localStorage.setItem("users", JSON.stringify(users));

  alert(`${animal.name} berhasil dibeli via ${metode.toUpperCase()}!`);
  loadFarm();
  loadProfile();
  document.getElementById("payment-qr").innerHTML = "";
}

// === WITHDRAW ===
function withdraw() {
  let pin = prompt("Masukkan kode keamanan:");
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  if (user && pin === user.pin) {
    alert("Penarikan berhasil! Saldo dikurangi Rp 50.000");
    user.balance -= 50000;
    localStorage.setItem("users", JSON.stringify(users));
    loadProfile();
  } else {
    alert("Kode keamanan salah!");
  }
}

// === LOGOUT ===
function logout() {
  localStorage.removeItem("currentUser");
  showPage("login");
}

// === ONLOAD ===
window.onload = () => {
  if (localStorage.getItem("currentUser")) {
    showPage("home");
  } else {
    showPage("register");
  }

  let data = [
    { name: "PeternakPro", total: 150000 },
    { name: "SultanTernak", total: 120000 },
    { name: "Pemula", total: 80000 }
  ];
  let tbody = document.getElementById("leaderboard-data");
  if (tbody) {
    data.forEach((u, i) => {
      let row = document.createElement("tr");
      row.innerHTML = `<td>${i+1}</td><td>${u.name}</td><td>Rp ${u.total.toLocaleString()}</td>`;
      tbody.appendChild(row);
    });
  }
};
