// Diagnóstico SOLO LECTURA del saldo de envases.
//
// Hasta la corrección de la auditoría, una entrega con N productos distintos
// guardaba los "envases devueltos" en cada producto, y la transacción los sumaba
// N veces. Resultado: el saldo de envases del cliente quedó MÁS BAJO de lo real
// en (N - 1) * devueltos por cada una de esas entregas.
//
// Este script no escribe nada. Lista, por cliente, cuántos envases faltan sumar.
//
// Uso:
//   SEED_EMAIL=admin@... SEED_PASSWORD=... npm run diagnose:bottles
//   (opcional) --csv para salida separada por comas

import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, getFirestore } from "firebase/firestore";

const CSV = process.argv.includes("--csv");
const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (Object.values(firebaseConfig).some((v) => !v)) {
  console.error("Faltan variables VITE_FIREBASE_* (correr con node --env-file=.env).");
  process.exit(1);
}
if (!email || !password) {
  console.error("Definí SEED_EMAIL y SEED_PASSWORD de un usuario admin.");
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
await signInWithEmailAndPassword(getAuth(app), email, password);

const toMillis = (v) => (typeof v?.toMillis === "function" ? v.toMillis() : null);

const [ordersSnap, clientsSnap] = await Promise.all([
  getDocs(collection(db, "orders")),
  getDocs(collection(db, "clients")),
]);

const clients = new Map(clientsSnap.docs.map((d) => [d.id, d.data()]));
const byClient = new Map();

for (const docSnap of ordersSnap.docs) {
  const o = docSnap.data();
  if (o.visitStatus !== "Completada") continue;
  if (o.bottlesReturned !== undefined) continue; // orden nueva, ya corregida
  const items = Array.isArray(o.items) ? o.items : [];
  if (items.length < 2) continue;

  const returned = Number(items[0]?.qtyReturned ?? 0);
  const error = (items.length - 1) * returned;
  if (!error) continue;

  const entry = byClient.get(o.clientId) ?? {
    orders: 0,
    missing: 0,
    missingAfterLastEdit: 0,
  };
  entry.orders += 1;
  entry.missing += error;

  // Si el admin editó el cliente después de la orden, puede haber corregido
  // el saldo a mano. Separamos lo que ocurrió después de la última edición.
  const editedAt = toMillis(clients.get(o.clientId)?.updatedAt);
  const orderAt = toMillis(o.date);
  if (editedAt == null || orderAt == null || orderAt > editedAt) {
    entry.missingAfterLastEdit += error;
  }
  byClient.set(o.clientId, entry);
}

const rows = [...byClient.entries()]
  .map(([clientId, e]) => {
    const c = clients.get(clientId);
    return {
      clientId,
      nombre: c?.name ?? "(cliente borrado)",
      saldoActual: Number(c?.balanceBottles ?? 0),
      ordenesAfectadas: e.orders,
      faltanSumar: e.missing,
      faltanSumarDesdeUltimaEdicion: e.missingAfterLastEdit,
    };
  })
  .sort((a, b) => b.faltanSumar - a.faltanSumar);

console.log(
  `Órdenes revisadas: ${ordersSnap.size}. Clientes afectados: ${rows.length}.\n`
);
if (CSV) {
  const cols = Object.keys(rows[0] ?? { clientId: "" });
  console.log(cols.join(","));
  rows.forEach((r) => console.log(cols.map((k) => JSON.stringify(r[k])).join(",")));
} else {
  console.table(rows);
}
process.exit(0);
