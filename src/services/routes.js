import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";

const collectionRef = collection(db, "clients");

export function listenClientsByDay(day, callback) {
  const qArray = query(
    collectionRef,
    where("routeDays", "array-contains", day),
    orderBy("routeOrder", "asc")
  );
  const qSingle = query(
    collectionRef,
    where("routeDay", "==", day),
    orderBy("routeOrder", "asc")
  );

  let itemsArray = [];
  let itemsSingle = [];

  const emit = () => {
    const map = new Map();
    [...itemsSingle, ...itemsArray].forEach((item) => {
      map.set(item.id, item);
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => Number(a.routeOrder ?? 0) - Number(b.routeOrder ?? 0)
    );
    callback(merged);
  };

  const unsubArray = onSnapshot(qArray, (snapshot) => {
    itemsArray = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    emit();
  });

  const unsubSingle = onSnapshot(qSingle, (snapshot) => {
    itemsSingle = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    emit();
  });

  return () => {
    unsubArray();
    unsubSingle();
  };
}

export function listenClientsByDayWithMeta(day, callback) {
  const qArray = query(
    collectionRef,
    where("routeDays", "array-contains", day),
    orderBy("routeOrder", "asc")
  );
  const qSingle = query(
    collectionRef,
    where("routeDay", "==", day),
    orderBy("routeOrder", "asc")
  );

  let itemsArray = [];
  let itemsSingle = [];
  let metaArray = false;
  let metaSingle = false;

  const emit = () => {
    const map = new Map();
    [...itemsSingle, ...itemsArray].forEach((item) => {
      map.set(item.id, item);
    });
    const merged = Array.from(map.values()).sort(
      (a, b) => Number(a.routeOrder ?? 0) - Number(b.routeOrder ?? 0)
    );
    callback(merged, metaArray || metaSingle);
  };

  const unsubArray = onSnapshot(
    qArray,
    { includeMetadataChanges: true },
    (snapshot) => {
      itemsArray = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      metaArray = snapshot.metadata.hasPendingWrites;
      emit();
    }
  );

  const unsubSingle = onSnapshot(
    qSingle,
    { includeMetadataChanges: true },
    (snapshot) => {
      itemsSingle = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      metaSingle = snapshot.metadata.hasPendingWrites;
      emit();
    }
  );

  return () => {
    unsubArray();
    unsubSingle();
  };
}

export async function saveRouteOrderBatch(clients) {
  const batch = writeBatch(db);
  clients.forEach((client, index) => {
    batch.update(doc(db, "clients", client.id), {
      routeOrder: index,
    });
  });
  await batch.commit();
}
