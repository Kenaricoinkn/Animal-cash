// Toggle sidebar
function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('active');
}

// Navigasi antar halaman
function showPage(pageId) {
  if (!localStorage.getItem("currentUser") && 
      !["login", "register", "forgot"].includes(pageId)) {
    pageId = "login";
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  document.getElementById('sidebar').classList.remove('active'); // auto close menu

  if (pageId === "profile") loadProfile();
  if (pageId === "farm") loadFarm();
}

// === Slider Banner ===
let currentSlide = 0;
function showSlide(index) {
  const slides = document.querySelectorAll(".slide");
  if (slides.length === 0) return;

  slides.forEach((s, i) => s.classList.remove("active"));
  slides[index].classList.add("active");

  document.querySelector(".slides").style.transform = `translateX(-${index * 100}%)`;
}
function nextSlide() {
  const slides = document.querySelectorAll(".slide");
  currentSlide = (currentSlide + 1) % slides.length;
  showSlide(currentSlide);
}
setInterval(nextSlide, 4000);

// === Hewan ===
const animals = [
  { name: "🐮 Sapi", price: 50000, income: 2000, days: 30 },
  { name: "🐔 Ayam", price: 20000, income: 800, days: 20 },
  { name: "🐑 Kambing", price: 30000, income: 1200, days: 25 },
  { name: "🐱 Kucing", price: 40000, income: 1500, days: 28 },
  { name: "🐘 Gajah", price: 100000, income: 5000, days: 40 }
];

// Render farm
function loadFarm() {
  let tbody = document.getElementById("farm-data");
  tbody.innerHTML = "";

  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  animals.forEach((a, i) => {
    let sudahPunya = user?.myFarm?.some(f => f.name === a.name);

    let row = document.createElement("tr");
    row.innerHTML = `
      <td>${a.name}</td>
      <td>Rp ${a.price.toLocaleString()}</td>
      <td>Rp ${a.income.toLocaleString()}</td>
      <td>${a.days} hari</td>
      <td>
        ${sudahPunya 
          ? `<button disabled>Sudah Dibeli</button>` 
          : `<button onclick="buyAnimal(${i})">Beli</button>`}
      </td>
    `;
    tbody.appendChild(row);
  });

  updateTotalEarnings();
}

function buyAnimal(index) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  if (!user) return;

  let animal = animals[index];

  // Cek kalau sudah punya
  if (user.myFarm && user.myFarm.some(f => f.name === animal.name)) {
    alert("Anda sudah membeli hewan ini!");
    return;
  }

  // Pilih metode bayar
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
  user.myFarm = user.myFarm || [];
  user.myFarm.push(animal);
  localStorage.setItem("users", JSON.stringify(users));

  alert(`${animal.name} berhasil dibeli via ${metode.toUpperCase()}!`);
  loadProfile();
  loadFarm();
  document.getElementById("payment-qr").innerHTML = "";
}

function updateTotalEarnings() {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  let total = 0;
  if (user && user.myFarm) {
    total = user.myFarm.reduce((sum, a) => sum + a.income, 0);
  }

  document.getElementById("total-earnings").textContent = 
    `Total Penghasilan: Rp ${total.toLocaleString()} /hari`;
}

// === Register ===
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

// === Login ===
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

// === Lupa Password ===
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

// === Profile ===
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

// === Tarik Saldo ===
function withdraw() {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  if (!user) return;

  let pin = prompt("Masukkan kode keamanan penarikan:");
  if (pin !== user.pin) {
    alert("Kode keamanan salah!");
    return;
  }

  if (user.balance <= 0) {
    alert("Saldo belum cukup untuk ditarik.");
    return;
  }

  alert(`Penarikan Rp ${user.balance.toLocaleString()} berhasil!`);
  user.balance = 0;
  localStorage.setItem("users", JSON.stringify(users));
  loadProfile();
}

// === Logout ===
function logout() {
  localStorage.removeItem("currentUser");
  alert("Anda telah logout.");
  showPage("login");
}

// === Leaderboard ===
function loadLeaderboard() {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let sorted = users.sort((a, b) => (b.myFarm?.length || 0) - (a.myFarm?.length || 0));

  let tbody = document.getElementById("leaderboard-data");
  tbody.innerHTML = "";

  sorted.slice(0, 10).forEach((u, i) => {
    let totalIncome = (u.myFarm || []).reduce((sum, a) => sum + a.income, 0);
    let row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${u.username}</td>
      <td>Rp ${totalIncome.toLocaleString()} /hari</td>
    `;
    tbody.appendChild(row);
  });
}

// Auto load home/leaderboard saat halaman siap
window.onload = () => {
  if (localStorage.getItem("currentUser")) {
    showPage("home");
    loadLeaderboard();
  } else {
    showPage("login");
  }
};
