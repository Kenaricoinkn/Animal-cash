// === Toggle Sidebar ===
export function toggleMenu() {
  document.getElementById("sidebar").classList.toggle("show");
}

// === Page Navigation ===
export function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById(pageId).classList.add("active");
}

// === Withdraw Dummy ===
export function withdraw() {
  alert("Fitur tarik saldo masih coming soon!");
}

// === Slider Auto ===
let currentSlide = 0;
export function initSlider() {
  const slides = document.querySelectorAll(".slide");
  setInterval(() => {
    currentSlide = (currentSlide + 1) % slides.length;
    document.querySelector(".slides").style.transform = `translateX(-${currentSlide * 100}%)`;
  }, 4000);
}
