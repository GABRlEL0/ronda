import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const collectionRef = collection(db, "clients");

export function listenClients(callback) {
  const q = query(collectionRef, orderBy("routeDay"), orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(items);
  });
}

export function listenAllClients(callback, limitCount = 300) {
  const q = query(collectionRef, orderBy("name"), limit(limitCount));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(items);
  });
}

export async function createClient(payload) {
  return addDoc(collectionRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateClient(id, payload) {
  return updateDoc(doc(db, "clients", id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteClient(id) {
  return deleteDoc(doc(db, "clients", id));
}
