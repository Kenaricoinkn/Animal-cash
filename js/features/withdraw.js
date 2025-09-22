// js/features/withdraw.js
// Fitur Tarik Saldo (E-Wallet & Bank)
// - Sinkron dengan HTML: #withdrawTab, #wdFormWallet, #wdFormBank, dll
// - Menampilkan ringkas saldo (pf-*) dari Firestore users/{uid}
// - Kirim pengajuan ke koleksi 'withdrawals' (status: pending)
// - Menarik riwayat penarikan user (realtime)

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let booted = false; // cegah double-init saat re-render

const fmtRp = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));

const toast = (m) => (window.App?.toast ? window.App.toast(m) : alert(m));

export function initWithdraw(user) {
  // pastikan ada user & tabnya tersedia
  if (!user) return;
  const tabRoot = document.getElementById("withdrawTab");
  if (!tabRoot) return;
  if (booted) return;
  booted = true;

  // --- refs elemen ---
  const tabWallet = document.getElementById("wdTabWallet");
  const tabBank = document.getElementById("wdTabBank");
  const formWallet = document.getElementById("wdFormWallet");
  const formBank = document.getElementById("wdFormBank");

  const pfQuant = tabRoot.querySelector(".pf-quant");
  const pfTotal = tabRoot.querySelector(".pf-total");
  const pfTotalApprox = tabRoot.querySelector(".pf-total-approx");

  const wdList = document.getElementById("wdList");

  // --- tab switch Wallet/Bank ---
  function activate(which) {
    const isWallet = which === "wallet";
    tabWallet?.classList.toggle("tab-active", isWallet);
    tabBank?.classList.toggle("tab-active", !isWallet);
    formWallet?.classList.toggle("hidden", !isWallet);
    formBank?.classList.toggle("hidden", isWallet);
  }
  tabWallet?.addEventListener("click", () => activate("wallet"));
  tabBank?.addEventListener("click", () => activate("bank"));
  activate("wallet");

  // --- Firestore / Auth helpers ---
  const auth = window.App?.firebase?.auth;
  const db = window.App?.firebase?.db || getFirestore();

  // Ringkas saldo realtime dari users/{uid}
  try {
    const onUserDoc = window.App?.firebase?.onUserDoc;
    if (typeof onUserDoc === "function") {
      onUserDoc(user.uid, (snap) => {
        if (!snap.exists()) return;
        const d = snap.data() || {};
        // Kamu bisa ganti sumber total di sini sesuai skema (mis: total aset = balance + profitAsset)
        const totalNominal = Number(d.balance || 0); // sesuaikan kalau perlu
        if (pfQuant) pfQuant.textContent = Number(d.balance || 0).toFixed(2);
        if (pfTotal) pfTotal.textContent = fmtRp(totalNominal);
        if (pfTotalApprox) pfTotalApprox.textContent = "≈ " + fmtRp(totalNominal);
      });
    }
  } catch (err) {
    console.warn("onUserDoc not available:", err);
  }

  // --- Submit: E-WALLET ---
  formWallet?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const me = auth?.currentUser || user;
    if (!me) return toast("Silakan login terlebih dahulu.");

    const provider = (
      tabRoot.querySelector('input[name="wallet"]:checked')?.value || ""
    ).trim();
    const number = (document.getElementById("wdwNumber")?.value || "").trim();
    const name = (document.getElementById("wdwName")?.value || "").trim();
    const amount = Number(document.getElementById("wdwAmount")?.value || 0);

    if (!provider) return toast("Pilih e-wallet terlebih dahulu.");
    if (!number || !name) return toast("Lengkapi nomor & nama pemilik.");
    if (amount < 10000) return toast("Minimal penarikan Rp 10.000.");

    try {
      await addDoc(collection(db, "withdrawals"), {
        uid: me.uid,
        type: "ewallet",
        provider,
        number,
        name,
        amount,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast("Permintaan tarik saldo dikirim. Menunggu persetujuan admin.");
      e.target.reset();
      const first = tabRoot.querySelector('input[name="wallet"]');
      if (first) first.checked = true;
    } catch (err) {
      console.error(err);
      toast("Gagal mengirim permintaan. Coba lagi.");
    }
  });

  // --- Submit: BANK ---
  formBank?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const me = auth?.currentUser || user;
    if (!me) return toast("Silakan login terlebih dahulu.");

    const bank = (
      tabRoot.querySelector('input[name="bank"]:checked')?.value || ""
    ).trim();
    const acc = (document.getElementById("wdbRek")?.value || "").trim();
    const owner = (document.getElementById("wdbName")?.value || "").trim();
    const amount = Number(document.getElementById("wdbAmount")?.value || 0);

    if (!bank) return toast("Pilih bank terlebih dahulu.");
    if (!acc || !owner)
      return toast("Lengkapi no. rekening & nama pemilik.");
    if (amount < 10000) return toast("Minimal penarikan Rp 10.000.");

    try {
      await addDoc(collection(db, "withdrawals"), {
        uid: me.uid,
        type: "bank",
        bank,
        account: acc,
        owner,
        amount,
        status: "pending",
        createdAt: serverTimestamp(),
      });
      toast("Permintaan tarik saldo dikirim. Menunggu persetujuan admin.");
      e.target.reset();
      const first = tabRoot.querySelector('input[name="bank"]');
      if (first) first.checked = true;
    } catch (err) {
      console.error(err);
      toast("Gagal mengirim permintaan. Coba lagi.");
    }
  });

  // --- Riwayat penarikan (realtime) ---
  if (wdList) {
    try {
      const q = query(
        collection(db, "withdrawals"),
        where("uid", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      onSnapshot(q, (snap) => {
        if (snap.empty) {
          wdList.innerHTML =
            '<li class="text-slate-400">Belum ada penarikan.</li>';
          return;
        }
        const items = [];
        snap.forEach((doc) => {
          const d = doc.data() || {};
          const ts = d.createdAt?.toDate ? d.createdAt.toDate() : null;
          const tstr = ts ? ts.toLocaleString("id-ID") : "-";
          const tujuan =
            d.type === "ewallet"
              ? `${d.provider || "-"} • ${d.number || "-"}`
              : `${d.bank || "-"} • ${d.account || "-"}`;
          const badgeClass =
            d.status === "approved"
              ? "bg-emerald-500/20 text-emerald-300"
              : d.status === "rejected"
              ? "bg-rose-500/20 text-rose-300"
              : "bg-amber-500/20 text-amber-300";
          items.push(`
            <li class="flex items-center justify-between gap-3">
              <div>
                <div class="font-semibold">${fmtRp(d.amount || 0)}</div>
                <div class="text-xs text-slate-400">${tujuan}</div>
              </div>
              <div class="text-right">
                <div class="text-xs px-2 py-0.5 rounded-full ${badgeClass}">
                  ${(d.status || "pending").toUpperCase()}
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">${tstr}</div>
              </div>
            </li>
          `);
        });
        wdList.innerHTML = items.join("");
      });
    } catch (err) {
      console.error("wd history error", err);
    }
  }
}
