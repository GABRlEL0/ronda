import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

function toNonNegativeInt(value) {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toNonNegativeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// Registra una entrega y actualiza saldos/stock en una sola transacción.
// `bottlesReturned` es el total de envases vacíos devueltos en la visita
// (no es por producto).
export async function confirmDelivery({
  clientId,
  driverId,
  items,
  bottlesReturned,
  paymentAmount,
  paymentMethod,
}) {
  const clientRef = doc(db, "clients", clientId);
  const orderRef = doc(collection(db, "orders"));

  const safeItems = items
    .map((item) => ({
      productId: item.productId,
      name: item.name,
      qtyDelivered: toNonNegativeInt(item.qtyDelivered),
      priceUnit: toNonNegativeNumber(item.priceUnit),
      isInfiniteStock: Boolean(item.isInfiniteStock),
      isWater: Boolean(item.isWater),
    }))
    .filter((item) => item.qtyDelivered > 0);

  if (safeItems.length === 0) throw new Error("Agregá al menos 1 producto.");

  const returned = toNonNegativeInt(bottlesReturned);
  const pay = toNonNegativeNumber(paymentAmount);
  const totalPrice = safeItems.reduce(
    (sum, item) => sum + item.qtyDelivered * item.priceUnit,
    0
  );
  const totalDelivered = safeItems.reduce((sum, item) => sum + item.qtyDelivered, 0);
  const hasWater = safeItems.some((item) => item.isWater);
  const finiteItems = safeItems.filter((item) => !item.isInfiniteStock);

  const result = await runTransaction(db, async (tx) => {
    // Firestore exige hacer TODAS las lecturas antes de cualquier escritura.
    const clientSnap = await tx.get(clientRef);
    if (!clientSnap.exists()) throw new Error("Cliente no encontrado.");

    const productRefs = finiteItems.map((item) => doc(db, "products", item.productId));
    const productSnaps = await Promise.all(productRefs.map((ref) => tx.get(ref)));

    const stockUpdates = finiteItems.map((item, idx) => {
      const snap = productSnaps[idx];
      if (!snap.exists()) throw new Error(`Producto no encontrado: ${item.name}`);
      const currentStock = Number(snap.data().stock ?? 0);
      const nextStock = currentStock - item.qtyDelivered;
      if (nextStock < 0) {
        throw new Error(
          `Stock insuficiente para ${item.name}. Disponible: ${currentStock}.`
        );
      }
      return { ref: productRefs[idx], stock: nextStock };
    });

    const client = clientSnap.data();
    const nextMoney = Number(client.balanceMoney ?? 0) + (totalPrice - pay);
    const nextBottles =
      Number(client.balanceBottles ?? 0) + (totalDelivered - returned);

    stockUpdates.forEach(({ ref, stock }) => tx.update(ref, { stock }));

    tx.set(orderRef, {
      clientId,
      driverId,
      date: serverTimestamp(),
      visitStatus: "Completada",
      totalPrice,
      paymentAmount: pay,
      paymentMethod,
      bottlesReturned: returned,
      newBalanceMoney: nextMoney,
      newBalanceBottles: nextBottles,
      items: safeItems,
    });

    const clientUpdate = {
      balanceMoney: nextMoney,
      balanceBottles: nextBottles,
      lastOrderDate: serverTimestamp(),
    };
    if (hasWater) clientUpdate.lastWaterDate = serverTimestamp();

    tx.update(clientRef, clientUpdate);
    return { newBalanceMoney: nextMoney, newBalanceBottles: nextBottles };
  });

  return {
    ...result,
    totalPrice,
    paymentAmount: pay,
    paymentMethod,
    bottlesReturned: returned,
    items: safeItems,
  };
}

export async function skipVisit({ clientId, driverId, note = "" }) {
  // Una sola escritura: no hace falta transacción.
  await setDoc(doc(collection(db, "orders")), {
    clientId,
    driverId,
    date: serverTimestamp(),
    visitStatus: "Fallida",
    note,
    totalPrice: 0,
    paymentAmount: 0,
    paymentMethod: null,
    items: [],
  });
}
