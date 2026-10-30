import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

const collectionRef = collection(db, "clients");

// Todos los clientes. Ordenar sólo por `name`: un orderBy sobre otro campo
// (ej. routeDay) excluye silenciosamente los documentos que no lo tienen.
export function listenClients(callback, onError) {
  const q = query(collectionRef, orderBy("name"));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      callback(items);
    },
    onError
  );
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

// `balanceDelta` se aplica como incremento atómico para no pisar un saldo que
// haya cambiado (ej. una entrega del repartidor) mientras el admin editaba.
export async function updateClient(id, payload, { balanceDelta = 0 } = {}) {
  const update = { ...payload, updatedAt: serverTimestamp() };
  if (Number.isFinite(balanceDelta) && balanceDelta !== 0) {
    update.balanceMoney = increment(balanceDelta);
  }
  return updateDoc(doc(db, "clients", id), update);
}

export async function deleteClient(id) {
  return deleteDoc(doc(db, "clients", id));
}
