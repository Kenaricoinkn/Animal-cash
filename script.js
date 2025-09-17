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

  let qrLink = (metode === "dana")
    ? "https://api.qrserver.com/v1/create-qr-code/?size=
