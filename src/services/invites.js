import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";

function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function toMillis(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) return value.getTime();
  return null;
}

function isExpired(invite, nowMs) {
  const expiresAtMs = toMillis(invite.expiresAt);
  if (expiresAtMs !== null) return expiresAtMs <= nowMs;
  const createdAtMs = toMillis(invite.createdAt);
  if (createdAtMs === null) return false;
  const end = new Date(createdAtMs);
  end.setHours(23, 59, 59, 999);
  return end.getTime() <= nowMs;
}

export function listenPendingInvites(callback) {
  const q = query(
    collection(db, "invites"),
    where("used", "==", false),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const nowMs = Date.now();
    const expired = [];
    const items = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data(), __ref: d.ref }))
      .filter((item) => {
        if (isExpired(item, nowMs)) {
          expired.push(item);
          return false;
        }
        return true;
      })
      .map(({ __ref, ...rest }) => rest);

    if (expired.length > 0) {
      const batch = writeBatch(db);
      expired.forEach((inv) => batch.delete(inv.__ref));
      batch.commit().catch(() => {});
    }

    callback(items);
  });
}

export async function createInvite({ email, role }) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) throw new Error("Email invalido.");

  const ref = doc(db, "invites", normalized);
  const expiresAt = endOfToday();
  await setDoc(ref, {
    email: normalized,
    role,
    used: false,
    expiresAt,
    createdAt: serverTimestamp(),
  });
}

export async function markInviteUsed(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const ref = doc(db, "invites", normalized);
  await updateDoc(ref, { used: true });
}

export async function getInviteByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  const snap = await getDoc(doc(db, "invites", normalized));
  if (!snap.exists()) return null;
  return snap.data();
}
