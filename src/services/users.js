import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

export function listenUsers(callback) {
  const q = query(collection(db, "users"), orderBy("email"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(items);
  });
}

export async function setUserActive(uid, active) {
  await updateDoc(doc(db, "users", uid), { active: Boolean(active) });
}

