// Fallback awal: pakai ?ref= kalau ada (sebelum login)
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('inviteLink');
  if (!el) return;
  const params = new URLSearchParams(location.search);
  const ref = params.get('ref');
  if (ref) el.value = `${location.origin}/Animal-cash/invite/${ref}`;
});

import { db, auth, onUser, doc, getDoc, setDoc, runTransaction } from "../firebase-init.js";

// generator kode 8 char
function genCode() {
  const pool = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  crypto.getRandomValues(new Uint32Array(8)).forEach(n => s += pool[n % pool.length]);
  return s;
}

// pastikan user punya referralCode (atomic)
async function ensureReferralCode(uid) {
  const ref = doc(db, "users", uid);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists() && snap.data().referralCode) return snap.data().referralCode;
    const code = genCode();
    tx.set(ref, { referralCode: code }, { merge: true });
    return code;
  });
}

function setInviteLink(code) {
  const el = document.getElementById("inviteLink");
  if (!el) return;
  const link = `${location.origin}/Animal-cash/invite/${code}`;
  el.value = link;
  // pastikan tidak tertimpa script lain
  setTimeout(() => { const x = document.getElementById("inviteLink"); if (x) x.value = link; }, 300);
}

onUser(async (user) => {
  if (!user) { setInviteLink("LOGIN_DULU"); return; }
  try {
    const code = await ensureReferralCode(user.uid);
    setInviteLink(code);
  } catch (e) {
    console.error("Referral error:", e);
    setInviteLink("ERROR");
  }
});
