import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

export async function confirmDelivery({
  clientId,
  driverId,
  items,
  paymentAmount,
  paymentMethod,
}) {
  const clientRef = doc(db, "clients", clientId);
  const orderRef = doc(collection(db, "orders"));

  await runTransaction(db, async (tx) => {
    const clientSnap = await tx.get(clientRef);
    if (!clientSnap.exists()) throw new Error("Cliente no encontrado.");

    const client = clientSnap.data();
    const prevMoney = Number(client.balanceMoney ?? 0);
    const prevBottles = Number(client.balanceBottles ?? 0);

    const safeItems = items.filter((item) => Number(item.qtyDelivered) > 0);
    const totalPrice = safeItems.reduce(
      (sum, item) => sum + Number(item.qtyDelivered) * Number(item.priceUnit),
      0
    );
    const totalDelivered = safeItems.reduce(
      (sum, item) => sum + Number(item.qtyDelivered),
      0
    );
    const totalReturned = safeItems.reduce(
      (sum, item) => sum + Number(item.qtyReturned),
      0
    );

    const hasWater = safeItems.some((item) => Boolean(item.isWater));

    const pay = Number(paymentAmount ?? 0);
    const nextMoney = prevMoney + (totalPrice - pay);
    const nextBottles = prevBottles + (totalDelivered - totalReturned);

    // Stock updates (only finite stock)
    for (const item of safeItems) {
      if (item.isInfiniteStock) continue;

      const productRef = doc(db, "products", item.productId);
      const productSnap = await tx.get(productRef);
      if (!productSnap.exists()) {
        throw new Error(`Producto no encontrado: ${item.name}`);
      }
      const product = productSnap.data();
      const currentStock = Number(product.stock ?? 0);
      const qty = Number(item.qtyDelivered);
      const nextStock = currentStock - qty;
      if (nextStock < 0) {
        throw new Error(
          `Stock insuficiente para ${item.name}. Disponible: ${currentStock}.`
        );
      }
      tx.update(productRef, { stock: nextStock });
    }

    tx.set(orderRef, {
      clientId,
      driverId,
      date: serverTimestamp(),
      visitStatus: "Completada",
      totalPrice,
      paymentAmount: pay,
      paymentMethod,
      newBalanceMoney: nextMoney,
      newBalanceBottles: nextBottles,
      items: safeItems.map((item) => ({
        productId: item.productId,
        name: item.name,
        qtyDelivered: Number(item.qtyDelivered),
        qtyReturned: Number(item.qtyReturned),
        priceUnit: Number(item.priceUnit),
        isInfiniteStock: Boolean(item.isInfiniteStock),
        isWater: Boolean(item.isWater),
      })),
    });

    const clientUpdate = {
      balanceMoney: nextMoney,
      balanceBottles: nextBottles,
      lastOrderDate: serverTimestamp(),
    };

    if (hasWater) {
      clientUpdate.lastWaterDate = serverTimestamp();
    }

    tx.update(clientRef, clientUpdate);
  });
}

export async function skipVisit({ clientId, driverId, note = "" }) {
  const orderRef = doc(collection(db, "orders"));
  await runTransaction(db, async (tx) => {
    tx.set(orderRef, {
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
  });
}
