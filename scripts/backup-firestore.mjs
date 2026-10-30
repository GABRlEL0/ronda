// Backup SOLO LECTURA de Firestore a archivos JSON locales.
// Usa un usuario admin de la app (las reglas le permiten leer todo).
//
// Uso:
//   SEED_EMAIL=admin@... SEED_PASSWORD=... npm run backup
//   (opcional) --out <carpeta>   por defecto ../ronda-backups/<fecha-hora>
//
// Los timestamps se guardan como { __ts: <ISO> } para poder restaurarlos.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { collection, getDocs, getFirestore, Timestamp } from "firebase/firestore";

const COLLECTIONS = ["clients", "products", "orders", "users", "invites"];

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx === -1 ? null : process.argv[idx + 1] ?? null;
}

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
const email = process.env.SEED_EMAIL;
const password = process.env.SEED_PASSWORD;
if (!email || !password) {
  console.error("Definí SEED_EMAIL y SEED_PASSWORD de un usuario admin.");
  process.exit(1);
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const outDir = resolve(getArg("out") || join("..", "ronda-backups", stamp));
mkdirSync(outDir, { recursive: true });

function serialize(value) {
  if (value instanceof Timestamp) return { __ts: value.toDate().toISOString() };
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === "object") {
    if (typeof value.path === "string" && typeof value.id === "string" && value.firestore) {
      return { __ref: value.path };
    }
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, serialize(v)]));
  }
  return value;
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
await signInWithEmailAndPassword(getAuth(app), email, password);

const summary = { project: firebaseConfig.projectId, createdAt: new Date().toISOString() };
for (const name of COLLECTIONS) {
  const snap = await getDocs(collection(db, name));
  const docs = snap.docs.map((d) => ({ id: d.id, data: serialize(d.data()) }));
  writeFileSync(join(outDir, `${name}.json`), JSON.stringify(docs, null, 1));
  summary[name] = docs.length;
  console.log(`${name}: ${docs.length} documentos`);
}
writeFileSync(join(outDir, "_summary.json"), JSON.stringify(summary, null, 1));
console.log(`\nBackup en ${outDir}`);
process.exit(0);
