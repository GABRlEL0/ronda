import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { getRouteOrder } from "../lib/days";

const collectionRef = collection(db, "clients");

// Escucha los clientes de un día. Combina `routeDays` (actual) y `routeDay`
// (legacy, clientes viejos con un solo día) y los ordena por el orden de ese día.
// callback(items, hasPendingWrites)
export function listenClientsByDay(day, callback, onError) {
  const queries = [
    query(collectionRef, where("routeDays", "array-contains", day)),
    query(collectionRef, where("routeDay", "==", day)),
  ];

  const results = queries.map(() => ({ items: [], pending: false, ready: false }));

  const emit = () => {
    if (!results.every((r) => r.ready)) return;
    const map = new Map();
    results.forEach((r) => r.items.forEach((item) => map.set(item.id, item)));
    const merged = Array.from(map.values()).sort(
      (a, b) => getRouteOrder(a, day) - getRouteOrder(b, day)
    );
    callback(
      merged,
      results.some((r) => r.pending)
    );
  };

  const unsubs = queries.map((q, idx) =>
    onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snapshot) => {
        results[idx] = {
          items: snapshot.docs.map((d) => ({ id: d.id, ...d.data() })),
          pending: snapshot.metadata.hasPendingWrites,
          ready: true,
        };
        emit();
      },
      (error) => {
        console.error(error);
        results[idx] = { ...results[idx], ready: true };
        onError?.(error);
        emit();
      }
    )
  );

  return () => unsubs.forEach((unsub) => unsub());
}

// Guarda el orden de visita de un día. Se escribe en `routeOrderByDay.<día>` para
// que un cliente con varios días tenga un orden independiente en cada uno.
// Se mantiene `routeOrder` sólo si el cliente visita un único día (compatibilidad).
export async function saveRouteOrderBatch(day, clients) {
  const batch = writeBatch(db);
  clients.forEach((client, index) => {
    const update = { [`routeOrderByDay.${day}`]: index };
    const days = Array.isArray(client.routeDays) ? client.routeDays : [];
    if (days.length <= 1) update.routeOrder = index;
    batch.update(doc(db, "clients", client.id), update);
  });
  await batch.commit();
}
