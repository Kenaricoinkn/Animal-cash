function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('active');
}

function showPage(pageId) {
  // Cek login
  if (!localStorage.getItem("currentUser") && 
      !["login", "register", "forgot"].includes(pageId)) {
    pageId = "login";
  }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');

  if (pageId === "profile") loadProfile();
}

// Register
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

  users.push({ email, username, password, pin, balance: 100000 });
  localStorage.setItem("users", JSON.stringify(users));
  alert("Registrasi berhasil, silakan login!");
  showPage("login");
}

// Login
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

// Lupa password
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

// Profile
function loadProfile() {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let current = localStorage.getItem("currentUser");
  let user = users.find(u => u.username === current);

  if (user) {
    document.getElementById("profile-username").textContent = user.username;
    document.getElementById("profile-email").textContent = user.email;
    document.getElementById("profile-balance").textContent = user.balance;
  }
}

// Withdraw
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

// Logout
function logout() {
  localStorage.removeItem("currentUser");
  showPage("login");
}

// Leaderboard dummy
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
