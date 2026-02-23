import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import { fetchOrdersByDateRange } from "../../services/orders";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";

function ymd(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function defaultMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { from: ymd(from), to: ymd(to) };
}

async function loadLookupMaps() {
  const [clientsSnap, usersSnap] = await Promise.all([
    getDocs(collection(db, "clients")),
    getDocs(collection(db, "users")),
  ]);

  const clients = {};
  clientsSnap.forEach((d) => {
    clients[d.id] = d.data();
  });

  const users = {};
  usersSnap.forEach((d) => {
    users[d.id] = d.data();
  });

  return { clients, users };
}

export default function Reports() {
  const [range, setRange] = useState(() => defaultMonthRange());
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [lookup, setLookup] = useState({ clients: {}, users: {} });
  const barRef = useRef(null);
  const pieRef = useRef(null);
  const [barSize, setBarSize] = useState({ w: 0, h: 0 });
  const [pieSize, setPieSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    loadLookupMaps()
      .then(setLookup)
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const barEl = barRef.current;
    const pieEl = pieRef.current;
    if (!barEl || !pieEl) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        const w = Math.max(0, Math.floor(width));
        const h = Math.max(0, Math.floor(height));
        if (entry.target === barEl) setBarSize({ w, h });
        if (entry.target === pieEl) setPieSize({ w, h });
      }
    });

    ro.observe(barEl);
    ro.observe(pieEl);
    return () => ro.disconnect();
  }, []);

  const run = async () => {
    setLoading(true);
    try {
      const from = startOfDay(new Date(range.from));
      const to = endOfDay(new Date(range.to));
      const items = await fetchOrdersByDateRange({ from, to });
      setOrders(items);
    } catch (err) {
      console.error(err);
      setToast("No se pudieron cargar las ordenes (revisar indices).");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!range.from || !range.to) return;
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const kpis = useMemo(() => {
    let totalSales = 0;
    let collected = 0;
    let collectedCash = 0;
    let collectedTransfer = 0;
    let waterUnits = 0;
    let otherUnits = 0;

    for (const o of orders) {
      totalSales += Number(o.totalPrice ?? 0);
      collected += Number(o.paymentAmount ?? 0);
      if (o.paymentMethod === "Transferencia") {
        collectedTransfer += Number(o.paymentAmount ?? 0);
      } else {
        collectedCash += Number(o.paymentAmount ?? 0);
      }

      const items = o.items || [];
      for (const it of items) {
        const qty = Number(it.qtyDelivered ?? 0);
        if (it.isWater) waterUnits += qty;
        else otherUnits += qty;
      }
    }

    return {
      totalSales,
      collected,
      collectedCash,
      collectedTransfer,
      waterUnits,
      otherUnits,
    };
  }, [orders]);

  const salesByDay = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      const d =
        typeof o.date?.toDate === "function" ? o.date.toDate() : new Date();
      const key = ymd(d);
      map.set(key, (map.get(key) || 0) + Number(o.totalPrice ?? 0));
    }
    return Array.from(map.entries()).map(([day, total]) => ({ day, total }));
  }, [orders]);

  const productMix = useMemo(() => {
    const map = new Map();
    for (const o of orders) {
      for (const it of o.items || []) {
        const key = it.name || "Producto";
        map.set(key, (map.get(key) || 0) + Number(it.qtyDelivered ?? 0));
      }
    }
    return Array.from(map.entries())
      .map(([name, qty]) => ({ name, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [orders]);

  const downloadXlsx = () => {
    const rows = orders.map((o) => {
      const d =
        typeof o.date?.toDate === "function" ? o.date.toDate() : new Date();
      const clientName =
        lookup.clients?.[o.clientId]?.name || String(o.clientId || "");
      const driverName =
        lookup.users?.[o.driverId]?.email || String(o.driverId || "");

      const itemsStr = (o.items || [])
        .map((it) => `${it.qtyDelivered}x ${it.name}`)
        .join(" | ");

      return {
        Fecha: d.toLocaleDateString("es-AR"),
        Cliente: clientName,
        Repartidor: driverName,
        Items: itemsStr,
        Total: Number(o.totalPrice ?? 0),
        Pago: Number(o.paymentAmount ?? 0),
        Metodo: o.paymentMethod || "",
        Estado: o.visitStatus || "",
        NuevoSaldo: Number(o.newBalanceMoney ?? 0),
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");

    const filename = `ronda-reporte_${range.from}_a_${range.to}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Reportes</h2>
          <p className="text-sm text-slate-500">
            KPIs, graficos y exportacion.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            Desde
            <input
              type="date"
              value={range.from}
              onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
              className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Hasta
            <input
              type="date"
              value={range.to}
              onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
              className="ml-2 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <Button
            className="w-auto px-6"
            onClick={downloadXlsx}
            disabled={orders.length === 0}
          >
            Descargar reporte
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-3 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Ventas por dia
          </p>
          <div ref={barRef} className="mt-4 h-64">
            {barSize.w > 0 && barSize.h > 0 ? (
              <BarChart width={barSize.w} height={barSize.h} data={salesByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#0f172a" radius={[8, 8, 0, 0]} />
              </BarChart>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Mix de productos (top)
          </p>
          <div ref={pieRef} className="mt-4 h-64">
            {pieSize.w > 0 && pieSize.h > 0 ? (
              <PieChart width={pieSize.w} height={pieSize.h}>
                <Tooltip />
                <Pie
                  data={productMix}
                  dataKey="qty"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {productMix.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={[
                        "#0f172a",
                        "#334155",
                        "#64748b",
                        "#0ea5e9",
                        "#22c55e",
                        "#f59e0b",
                        "#f97316",
                        "#e11d48",
                      ][idx % 8]}
                    />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Ventas" value={`$${kpis.totalSales.toFixed(0)}`} />
        <KpiCard label="Recaudado" value={`$${kpis.collected.toFixed(0)}`} />
        <KpiCard
          label="Efectivo"
          value={`$${kpis.collectedCash.toFixed(0)}`}
        />
        <KpiCard
          label="Transferencia"
          value={`$${kpis.collectedTransfer.toFixed(0)}`}
        />
        <KpiCard label="Volumen agua" value={`${kpis.waterUnits}`} />
        <KpiCard label="Volumen otros" value={`${kpis.otherUnits}`} />
        <KpiCard label="Ordenes" value={`${orders.length}`} />
        <KpiCard label="Estado" value={loading ? "Cargando..." : "OK"} />
      </div>

      <Toast message={toast} onClear={() => setToast("")} />
    </section>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
