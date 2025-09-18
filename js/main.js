import { registerUser, loginUser, logout } from "./auth.js";
import { buyAnimal } from "./farm.js";
import { toggleMenu, showPage, initSlider, withdraw } from "./ui.js";

// Biar bisa dipanggil dari HTML
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logout = logout;
window.buyAnimal = buyAnimal;
window.toggleMenu = toggleMenu;
window.showPage = showPage;
window.withdraw = withdraw;

// Init
document.addEventListener("DOMContentLoaded", () => {
  initSlider();

  const uid = localStorage.getItem("currentUser");
  const lastPage = localStorage.getItem("lastPage");

  if (uid) {
    // Kalau login & ada halaman terakhir
    if (lastPage) {
      showPage(lastPage);
    } else {
      showPage("home");
    }
  } else {
    showPage("login");
  }
});
