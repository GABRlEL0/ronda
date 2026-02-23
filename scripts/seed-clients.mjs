import { initializeApp } from "firebase/app";
import { signInWithEmailAndPassword, getAuth } from "firebase/auth";
import { collection, doc, getDoc, getFirestore, writeBatch } from "firebase/firestore";

function getArg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

const YES = process.argv.includes("--yes");

const SEED_EMAIL = getArg("email") || process.env.SEED_EMAIL || process.env.SEED_ADMIN_EMAIL;
const SEED_PASSWORD =
  getArg("password") || process.env.SEED_PASSWORD || process.env.SEED_ADMIN_PASSWORD;

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const missing = Object.entries(firebaseConfig)
  .filter(([, v]) => !v)
  .map(([k]) => k);

if (missing.length) {
  console.error(
    `Faltan variables de entorno de Firebase: ${missing.join(", ")}. ` +
      "Ejecuta el script con: node --env-file=.env scripts/seed-clients.mjs ..."
  );
  process.exit(1);
}

if (!SEED_EMAIL || !SEED_PASSWORD) {
  console.error(
    "Faltan credenciales de admin para seed. " +
      "Usa --email/--password o variables SEED_EMAIL/SEED_PASSWORD."
  );
  process.exit(1);
}

if (!YES) {
  console.error(
    "Este script va a crear 20 clientes en Firestore. " +
      "Re-ejecuta con --yes para confirmar."
  );
  process.exit(1);
}

const CLIENTS = [
  // Lunes (4)
  { name: "Marta Quiroga", address: "Av. San Martin 245", phone: "3515001001", routeDay: "Lunes", balanceMoney: 0, balanceBottles: 0 },
  { name: "Pedro Salas", address: "Belgrano 980", phone: "3515001002", routeDay: "Lunes", balanceMoney: 1500, balanceBottles: 2 },
  { name: "Sofia Romano", address: "Rivadavia 112", phone: "3515001003", routeDay: "Lunes", balanceMoney: 0, balanceBottles: 4 },
  { name: "Diego Funes", address: "Las Heras 430", phone: "3515001004", routeDay: "Lunes", balanceMoney: 3200, balanceBottles: 1 },
  // Martes (4)
  { name: "Luciana Pereyra", address: "Buenos Aires 77", phone: "3515001005", routeDay: "Martes", balanceMoney: 0, balanceBottles: 0 },
  { name: "Gabriel Molina", address: "9 de Julio 615", phone: "3515001006", routeDay: "Martes", balanceMoney: 800, balanceBottles: 0 },
  { name: "Carla Benitez", address: "Sarmiento 1200", phone: "3515001007", routeDay: "Martes", balanceMoney: 0, balanceBottles: 3 },
  { name: "Tomas Aguilar", address: "Mitre 501", phone: "3515001008", routeDay: "Martes", balanceMoney: 2500, balanceBottles: 2 },
  // Miercoles (3)
  { name: "Valeria Diaz", address: "Ituzaingo 389", phone: "3515001009", routeDay: "Miercoles", balanceMoney: 0, balanceBottles: 0 },
  { name: "Nicolas Herrera", address: "Alvear 930", phone: "3515001010", routeDay: "Miercoles", balanceMoney: 1200, balanceBottles: 1 },
  { name: "Paula Rojas", address: "Santa Fe 140", phone: "3515001011", routeDay: "Miercoles", balanceMoney: 0, balanceBottles: 2 },
  // Jueves (3)
  { name: "Emiliano Castro", address: "Urquiza 710", phone: "3515001012", routeDay: "Jueves", balanceMoney: 0, balanceBottles: 0 },
  { name: "Agustina Luna", address: "Dean Funes 55", phone: "3515001013", routeDay: "Jueves", balanceMoney: 4100, balanceBottles: 0 },
  { name: "Franco Navarro", address: "Chacabuco 1020", phone: "3515001014", routeDay: "Jueves", balanceMoney: 0, balanceBottles: 1 },
  // Viernes (3)
  { name: "Mariana Vega", address: "Colon 880", phone: "3515001015", routeDay: "Viernes", balanceMoney: 900, balanceBottles: 0 },
  { name: "Juan Paz", address: "General Paz 330", phone: "3515001016", routeDay: "Viernes", balanceMoney: 0, balanceBottles: 5 },
  { name: "Rocio Silva", address: "Catamarca 260", phone: "3515001017", routeDay: "Viernes", balanceMoney: 1600, balanceBottles: 2 },
  // Sabado (3)
  { name: "Alan Gimenez", address: "Obispo Trejo 144", phone: "3515001018", routeDay: "Sabado", balanceMoney: 0, balanceBottles: 0 },
  { name: "Florencia Sosa", address: "Salta 999", phone: "3515001019", routeDay: "Sabado", balanceMoney: 2300, balanceBottles: 1 },
  { name: "Cristian Peralta", address: "Tucuman 410", phone: "3515001020", routeDay: "Sabado", balanceMoney: 0, balanceBottles: 2 },
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, SEED_EMAIL, SEED_PASSWORD);
const uid = auth.currentUser?.uid;

if (!uid) {
  console.error("No se pudo obtener uid tras login.");
  process.exit(1);
}

const userSnap = await getDoc(doc(db, "users", uid));
if (!userSnap.exists()) {
  console.error(
    `No existe users/${uid}. Crea el doc con role=admin para poder seedear.`
  );
  process.exit(1);
}

if (userSnap.data()?.role !== "admin") {
  console.error("El usuario de seed no tiene role=admin.");
  process.exit(1);
}

const batch = writeBatch(db);
const clientsRef = collection(db, "clients");

CLIENTS.forEach((client) => {
  const ref = doc(clientsRef); // auto-id
  batch.set(ref, {
    ...client,
    routeOrder: 9999,
    lastOrderDate: null,
  });
});

await batch.commit();
console.log(`OK: creados ${CLIENTS.length} clientes.`);
