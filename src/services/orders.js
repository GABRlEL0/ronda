import {
  collection,
  getDocs,
  orderBy,
  query,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

export async function fetchOrdersByDateRange({ from, to }) {
  const fromTs = Timestamp.fromDate(from);
  const toTs = Timestamp.fromDate(to);

  const q = query(
    collection(db, "orders"),
    where("date", ">=", fromTs),
    where("date", "<=", toTs),
    orderBy("date", "asc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

