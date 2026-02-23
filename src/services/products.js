import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const collectionRef = collection(db, "products");

export function listenProducts(callback) {
  const q = query(collectionRef, orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    callback(items);
  });
}

export function listenActiveProducts(callback) {
  const q = query(collectionRef, orderBy("name"));
  return onSnapshot(q, (snapshot) => {
    const items = snapshot.docs
      .map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }))
      .filter((item) => item.isActive !== false)
      .filter((item) => {
        if (item.isInfiniteStock) return true;
        const stock = Number(item.stock ?? 0);
        return stock > 0;
      });
    callback(items);
  });
}

export async function createProduct(payload) {
  return addDoc(collectionRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateProduct(id, payload) {
  return updateDoc(doc(db, "products", id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id) {
  return deleteDoc(doc(db, "products", id));
}
