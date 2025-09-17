function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('active');
}

function showPage(pageId) {
  let current = localStorage.getItem("currentUser");

  if (!current && !["login", "register", "forgot"].includes(pageId)) {
    alert("Harus login dulu!");
    pageId = "login";
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  document.getElementById('sidebar').classList.remove('active');

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

// === Reset Password ===
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

// === Load Profile ===
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

// === Buy Animal ===
const animals = {
  sapi: { price: 50000, income: 2000, label: "Sapi" },
  ayam: { price: 20000, income: 800, label: "Ayam" },
  kambing: { price: 30000, income: 1200, label: "Kambing" },
  kucing: { price: 40000, income: 1500, label: "Kucing" },
  gajah: { price: 100000, income: 5000, label: "Gajah" }
};

function buyAnimal(type) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);
  if (!user) return;

  if (user.myFarm.find(a => a.name === type)) {
    alert("Hewan ini sudah dibeli!");
    return;
  }

  let metode = prompt("Pilih metode pembayaran: Dana / OVO").toLowerCase();
  if (metode !== "dana" && metode !== "ovo") {
    alert("Metode tidak valid!");
    return;
  }

  // === Generate QR Dummy ===
  let qrText = `Transfer ${animals[type].price} ke Admin via ${metode}`;
  let qrLink = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrText)}`;

  let qrBox = document.getElementById("farm-qr");
  qrBox.innerHTML = `
    <h3>Pembayaran via ${metode.toUpperCase()}</h3>
    <p>Silakan scan QR berikut untuk transfer Rp ${animals[type].price.toLocaleString()}</p>
    <img src="${qrLink}" alt="QR ${metode}">
    <br><button onclick="confirmPayment('${type}')">Saya sudah transfer</button>
  `;
  qrBox.style.display = "block";
  qrBox.scrollIntoView({ behavior: "smooth" });
}

function confirmPayment(type) {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);
  if (!user) return;

  // Simpan hewan ke myFarm
  user.myFarm.push({ name: type, income: animals[type].income });
  localStorage.setItem("users", JSON.stringify(users));

  alert(`Pembelian ${animals[type].label} berhasil!`);
  document.getElementById("farm-qr").style.display = "none";
  loadFarm();
}

// === Load Farm ===
function loadFarm() {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);
  if (!user) return;

  // Update tombol beli
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

  // Hitung total income
  let total = user.myFarm.reduce((sum, a) => sum + a.income, 0);
  document.getElementById("farm-income").textContent = `Rp ${total.toLocaleString()} /hari`;

  // Warning kalau belum punya hewan
  let warn = document.getElementById("farm-warning");
  warn.style.display = user.myFarm.length === 0 ? "block" : "none";
  warn.textContent = "⚠️ Kamu belum membeli hewan!";
}

// === Withdraw ===
function withdraw() {
  let pin = prompt("Masukkan kode keamanan:");
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  if (user && pin === user.pin) {
    if (user.balance < 50000) {
      alert("Saldo tidak cukup!");
      return;
    }
    alert("Penarikan berhasil! Saldo dikurangi Rp 50.000");
    user.balance -= 50000;
    localStorage.setItem("users", JSON.stringify(users));
    loadProfile();
  } else {
    alert("Kode keamanan salah!");
  }
}

// === Logout ===
function logout() {
  localStorage.removeItem("currentUser");
  showPage("login");
}

// === Leaderboard Dummy ===
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
    tbody.innerHTML = "";
    data.forEach((u, i) => {
      let row = document.createElement("tr");
      row.innerHTML = `<td>${i + 1}</td><td>${u.name}</td><td>Rp ${u.total.toLocaleString()}</td>`;
      tbody.appendChild(row);
    });
  }
};
