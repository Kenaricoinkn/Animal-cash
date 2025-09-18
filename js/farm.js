import { db } from "./firebase.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const animals = {
  sapi: { price: 50000, income: 2000 },
  ayam: { price: 20000, income: 800 }
};

// === Buy Animal ===
export async function buyAnimal(type) {
  const uid = localStorage.getItem("currentUser");
  if (!uid) { alert("Login dulu!"); return; }

  await addDoc(collection(db, "transactions"), {
    userId: uid,
    animal: type,
    amount: animals[type].price,
    status: "pending",
    createdAt: serverTimestamp()
  });

  document.getElementById("farm-summary").innerHTML = `
    <h3>Pembelian ${type}</h3>
    <p>Harga Rp ${animals[type].price.toLocaleString()}</p>
    <p>Status: Pending, tunggu approval admin</p>
  `;
}
