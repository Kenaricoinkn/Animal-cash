function toggleMenu() {
  document.getElementById('sidebar').classList.toggle('active');
}

function showPage(pageId) {
  // Jika belum login, paksa ke login
  if (!localStorage.getItem("user") && pageId !== "login") {
    alert("Silakan login terlebih dahulu!");
    pageId = "login";
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(pageId).classList.add('active');
  document.getElementById('sidebar').classList.remove('active');

  // Tampilkan data user di profile
  if (pageId === "profile") {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
      document.getElementById("profile-username").textContent = user.username;
      document.getElementById("profile-email").textContent = user.email;
    }
  }
}

// Login function
function loginUser(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const user = { username, email, password };
  localStorage.setItem("user", JSON.stringify(user));

  alert("Login berhasil! Selamat datang " + username);
  showPage("home");
}

// Logout function
function logout() {
  localStorage.removeItem("user");
  alert("Anda telah logout.");
  showPage("login");
}

// Leaderboard Dummy Data
const leaderboard = [
  { name: "User123", total: 150000 },
  { name: "FarmerPro", total: 120000 },
  { name: "SultanTernak", total: 100000 },
  { name: "Beginner01", total: 80000 }
];

// Isi leaderboard
window.onload = () => {
  // Cek apakah user sudah login
  if (!localStorage.getItem("user")) {
    showPage("login");
  } else {
    showPage("home");
  }

  const tbody = document.getElementById("leaderboard-data");
  leaderboard.forEach((user, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${user.name}</td>
      <td>Rp ${user.total.toLocaleString()}</td>
    `;
    tbody.appendChild(row);
  });
};
