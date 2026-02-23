import { useEffect, useMemo, useState } from "react";
import { Cloud, MapPin, MessageCircle, Search } from "lucide-react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DriverLayout from "../../components/layout/DriverLayout";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import { listenClientsByDayWithMeta } from "../../services/routes";
import { listenActiveProducts } from "../../services/products";
import { confirmDelivery, skipVisit } from "../../services/deliveries";
import { useAuth } from "../../auth/authContext";
import { saveRouteOrderBatch } from "../../services/routes";
import { listenAllClients } from "../../services/clients";
import { buildWhatsAppUrl } from "../../lib/whatsapp";

const DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

const DAY_INITIALS = ["D", "L", "M", "X", "J", "V", "S"];

const CRITICAL_DEBT_LIMIT = 20000;

function todayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function offRouteKey() {
  return `ronda:offroute:${todayKey()}`;
}

function receiptsKey() {
  return `ronda:receipts:${todayKey()}`;
}

function loadVisited() {
  try {
    const raw = localStorage.getItem(`ronda:visited:${todayKey()}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVisited(state) {
  try {
    localStorage.setItem(`ronda:visited:${todayKey()}`, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function loadOffRouteVisits() {
  try {
    const raw = localStorage.getItem(offRouteKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOffRouteVisits(items) {
  try {
    localStorage.setItem(offRouteKey(), JSON.stringify(items));
  } catch {
    // ignore
  }
}

function loadReceipts() {
  try {
    const raw = localStorage.getItem(receiptsKey());
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveReceipts(map) {
  try {
    localStorage.setItem(receiptsKey(), JSON.stringify(map));
  } catch {
    // ignore
  }
}

function buildMapsUrl(client) {
  const coords = client?.coords;
  if (coords?.lat != null && coords?.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${coords.lat},${coords.lng}`
    )}`;
  }
  const address = client?.address ?? "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address
  )}`;
}

function daysSince(timestamp) {
  if (!timestamp) return null;
  const date =
    typeof timestamp?.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  if (Number.isNaN(date?.getTime?.())) return null;
  const diffMs = Date.now() - date.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

function waterStatus(client) {
  const cycle = Number(client?.consumptionCycle ?? 7);
  const safeCycle = Number.isFinite(cycle) && cycle > 0 ? cycle : 7;
  const days = daysSince(client?.lastWaterDate);
  if (days == null) return "neutral";
  if (days < safeCycle * 0.5) return "green";
  if (days < safeCycle) return "yellow";
  return "red";
}

function QtyStepper({ value, onChange, max }) {
  const maxValue = Number.isFinite(max) ? max : null;
  const canInc = maxValue == null || value < maxValue;
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-semibold text-slate-700 shadow-sm active:scale-[0.98]"
      >
        -
      </button>
      <div className="w-12 text-center text-xl font-semibold text-slate-900">
        {value}
      </div>
      <button
        type="button"
        onClick={() =>
          onChange(maxValue == null ? value + 1 : Math.min(maxValue, value + 1))
        }
        disabled={!canInc}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-semibold shadow-sm active:scale-[0.98] ${
          canInc
            ? "bg-slate-900 text-white"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        +
      </button>
    </div>
  );
}

function Sheet({ title, children, onClose, position = "bottom" }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`absolute inset-x-0 max-h-[92vh] overflow-auto bg-white p-5 shadow-2xl ${
          position === "center"
            ? "top-1/2 -translate-y-1/2 rounded-[28px] mx-4"
            : "bottom-0 rounded-t-[28px]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Entrega
            </p>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-5 space-y-6">{children}</div>
      </div>
    </div>
  );
}

export default function DriverHome() {
  const { user } = useAuth();
  const todayIndex = useMemo(() => new Date().getDay(), []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const day = DAYS[selectedDayIndex];

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedSource, setSelectedSource] = useState("route"); // route | offroute
  const [toast, setToast] = useState("");
  const [visited, setVisited] = useState(() => loadVisited());
  const [showCompleted, setShowCompleted] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [offRouteOpen, setOffRouteOpen] = useState(false);
  const [offRouteQuery, setOffRouteQuery] = useState("");
  const [offRouteClients, setOffRouteClients] = useState([]);
  const [offRouteVisits, setOffRouteVisitsState] = useState(() =>
    loadOffRouteVisits()
  );
  const [receiptDetail, setReceiptDetail] = useState(null);
  const [receipts, setReceipts] = useState(() => loadReceipts());
  const [syncing, setSyncing] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [whatsappClient, setWhatsappClient] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    setLoadingClients(true);
    const unsubscribe = listenClientsByDayWithMeta(day, (items, hasPendingWrites) => {
      setClients(items);
      setLoadingClients(false);
      setSyncing(Boolean(hasPendingWrites));
    });
    return () => unsubscribe();
  }, [day]);

  useEffect(() => {
    setLoadingProducts(true);
    const unsubscribe = listenActiveProducts((items) => {
      setProducts(items);
      setLoadingProducts(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!offRouteOpen) return undefined;
    const unsubscribe = listenAllClients((items) => setOffRouteClients(items));
    return () => unsubscribe();
  }, [offRouteOpen]);

  useEffect(() => {
    saveVisited(visited);
  }, [visited]);

  useEffect(() => {
    saveOffRouteVisits(offRouteVisits);
  }, [offRouteVisits]);

  useEffect(() => {
    saveReceipts(receipts);
  }, [receipts]);

  const pendingClients = useMemo(() => {
    return clients.filter((client) => !visited[client.id]);
  }, [clients, visited]);

  const completedClients = useMemo(() => {
    return clients.filter((client) => Boolean(visited[client.id]));
  }, [clients, visited]);

  const openClient = (client) => {
    if (visited[client.id]) return;
    setSelectedSource("route");
    setSelected(client);
  };

  const retryRouteClient = (client) => {
    setVisited((prev) => {
      const next = { ...prev };
      delete next[client.id];
      return next;
    });
    setReceipts((prev) => {
      const next = { ...prev };
      delete next[client.id];
      return next;
    });
    setSelectedSource("route");
    setSelected(client);
  };

  const openOffRouteClient = (client) => {
    setOffRouteOpen(false);
    setOffRouteQuery("");
    setSelectedSource("offroute");
    setSelected(client);
  };

  const retryOffRouteClient = (item) => {
    setOffRouteVisitsState((prev) =>
      prev.filter((x) => x.clientId !== item.clientId)
    );
    setReceipts((prev) => {
      const next = { ...prev };
      delete next[item.clientId];
      return next;
    });
    setSelectedSource("offroute");
    setSelected({
      id: item.clientId,
      name: item.name,
      address: item.address,
      phone: item.phone,
      coords: item.coords ?? null,
    });
  };

  const filteredOffRouteClients = useMemo(() => {
    const q = offRouteQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return offRouteClients.filter((client) => {
      const hay = `${client.name ?? ""} ${client.address ?? ""} ${
        client.phone ?? ""
      }`.toLowerCase();
      return hay.includes(q);
    });
  }, [offRouteClients, offRouteQuery]);

  const loadTotals = useMemo(() => {
    return clients.reduce(
      (acc, client) => {
        const water = Number(client?.defaultLoad?.water ?? 0);
        const soda = Number(client?.defaultLoad?.soda ?? 0);
        acc.water += Number.isNaN(water) ? 0 : water;
        acc.soda += Number.isNaN(soda) ? 0 : soda;
        return acc;
      },
      { water: 0, soda: 0 }
    );
  }, [clients]);

  const pendingIds = useMemo(
    () => pendingClients.map((client) => client.id),
    [pendingClients]
  );

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Reorder only pending clients; keep completed at the bottom.
    const oldIndex = pendingIds.indexOf(active.id);
    const newIndex = pendingIds.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const pendingNext = arrayMove(pendingClients, oldIndex, newIndex);
    const nextAll = [...pendingNext, ...completedClients];
    setClients(nextAll);

    // Persist immediately (driver wants "auto save" on drop).
    setSavingOrder(true);
    try {
      await saveRouteOrderBatch(nextAll);
      setToast("Orden guardado.");
    } catch (error) {
      console.error(error);
      setToast("No se pudo guardar el orden.");
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <DriverLayout syncState={syncing ? "syncing" : "ok"}>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Clientes del día
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Tocá un cliente para registrar la visita.
            </p>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            {pendingClients.length}/{clients.length}
          </div>
        </div>

        {/* Selector de día */}
        <div className="mt-4 flex justify-between gap-1">
          {DAY_INITIALS.map((initial, idx) => {
            const isActive = idx === selectedDayIndex;
            const isToday = idx === todayIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`relative flex h-10 w-10 flex-col items-center justify-center rounded-full text-sm font-semibold transition active:scale-95 ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md"
                    : "border border-slate-200 bg-white text-slate-600"
                }`}
              >
                {initial}
                {isToday && (
                  <span
                    className={`absolute bottom-[6px] h-1 w-1 rounded-full ${
                      isActive ? "bg-white/60" : "bg-slate-900"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-3">
          {loadingClients ? (
            <p className="text-sm text-slate-500">Cargando ruta...</p>
          ) : pendingClients.length === 0 ? (
            <p className="text-sm text-slate-500">
              No hay clientes pendientes para hoy.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={pendingIds}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {pendingClients.map((client, idx) => (
                    <SortableClientCard
                      key={client.id}
                      client={client}
                      index={idx}
                      onOpen={() => openClient(client)}
                      onWhatsApp={(c) => setWhatsappClient(c)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {savingOrder ? (
          <p className="mt-3 text-xs font-semibold text-slate-400">
            Guardando orden...
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setOffRouteOpen(true)}
          className="mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          <Search size={18} />
          Entrega fuera de ruta
        </button>

        <button
          type="button"
          onClick={() => setLoadOpen(true)}
          className="mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
        >
          Ver carga total
        </button>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300"
          >
            {showCompleted ? "Ocultar completados hoy" : "Ver completados hoy"}
          </button>
        </div>

        {showCompleted ? (
          <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Completados / Omitidos
            </p>
            {completedClients.length === 0 && offRouteVisits.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                Todavia no marcaste visitas hoy.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {completedClients.map((client) => (
                  <div
                    key={client.id}
                    className="rounded-3xl border border-slate-200 bg-white p-4"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      const r = receipts?.[client.id];
                      if (r) setReceiptDetail(r);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        const r = receipts?.[client.id];
                        if (r) setReceiptDetail(r);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-500">
                          {client.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {client.address}
                        </p>
                        <p className="mt-2 text-xs font-semibold text-slate-400">
                          Estado: {visited[client.id]}
                        </p>
                        {visited[client.id] === "Fallida" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              retryRouteClient(client);
                            }}
                            className="mt-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
                          >
                            Reintentar
                          </button>
                        ) : null}
                      </div>
                      <a
                        href={buildMapsUrl(client)}
                        target="_blank"
                        rel="noreferrer"
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
                        title="Abrir Maps"
                      >
                        <MapPin />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {offRouteVisits.length ? (
              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Fuera de ruta
                  </p>
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {offRouteVisits.length}
                  </span>
                </div>
                <div className="mt-3 space-y-3">
                  {offRouteVisits
                    .slice()
                    .sort((a, b) => (b.ts ?? 0) - (a.ts ?? 0))
                    .map((item) => (
                      <div
                        key={item.clientId}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const r = receipts?.[item.clientId];
                          if (r) setReceiptDetail(r);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            setReceiptDetail(receipts?.[item.clientId] || null);
                        }}
                        className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-slate-700">
                                {item.name || "Cliente"}
                              </p>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                Fuera de ruta
                              </span>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {item.address}
                            </p>
                            <p className="mt-2 text-xs font-semibold text-slate-400">
                              Estado: {item.status}
                            </p>
                            {item.status === "Fallida" ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  retryOffRouteClient(item);
                                }}
                                className="mt-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
                              >
                                Reintentar
                              </button>
                            ) : null}
                          </div>
                          <a
                            href={buildMapsUrl(item)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600"
                            title="Abrir Maps"
                          >
                            <MapPin />
                          </a>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {selected ? (
        <DeliverySheet
          client={selected}
          driverId={user?.uid ?? ""}
          products={products}
          loadingProducts={loadingProducts}
          onClose={() => {
            setSelected(null);
            setSelectedSource("route");
          }}
          onDone={(clientId, status, receipt) => {
            const snapshot = selected;
            const source = selectedSource;

            setVisited((prev) => ({ ...prev, [clientId]: status }));
            setSelected(null);
            setSelectedSource("route");
            setToast(
              status === "Completada"
                ? "Entrega exitosa."
                : "Cliente omitido (no estaba)."
            );

            if (receipt) {
              setReceipts((prev) => ({
                ...prev,
                [clientId]: {
                  ...receipt,
                  clientId,
                  status,
                  source,
                  ts: Date.now(),
                  client: {
                    id: snapshot?.id || clientId,
                    name: snapshot?.name ?? receipt?.client?.name ?? "",
                    address: snapshot?.address ?? receipt?.client?.address ?? "",
                    phone: snapshot?.phone ?? receipt?.client?.phone ?? "",
                    coords: snapshot?.coords ?? receipt?.client?.coords ?? null,
                  },
                },
              }));
            }

            if (source === "offroute" && snapshot) {
              setOffRouteVisitsState((prev) => {
                const next = prev.filter((x) => x.clientId !== clientId);
                next.push({
                  clientId,
                  status,
                  name: snapshot.name ?? "",
                  address: snapshot.address ?? "",
                  phone: snapshot.phone ?? "",
                  coords: snapshot.coords ?? null,
                  ts: Date.now(),
                });
                return next;
              });
            }
          }}
          onError={(message) => setToast(message)}
        />
      ) : null}

      {offRouteOpen ? (
        <Sheet
          title="Entrega fuera de ruta"
          onClose={() => setOffRouteOpen(false)}
          position="center"
        >
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="block text-sm font-semibold text-slate-700">
                Buscar cliente
                <Input
                  value={offRouteQuery}
                  onChange={(e) => setOffRouteQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                />
              </label>
              <p className="mt-2 text-xs text-slate-500">
                Buscá por nombre, dirección o teléfono.
              </p>
            </div>

            <div className="space-y-3">
              {offRouteQuery.trim().length < 2 ? (
                <p className="text-sm text-slate-500">
                  Ingresá al menos 2 letras para ver resultados.
                </p>
              ) : filteredOffRouteClients.length === 0 ? (
                <p className="text-sm text-slate-500">No hay coincidencias.</p>
              ) : (
                filteredOffRouteClients.slice(0, 50).map((client) => (
                  <div
                    key={client.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openOffRouteClient(client)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ")
                        openOffRouteClient(client);
                    }}
                    className="cursor-pointer rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {client.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {client.address}
                        </p>
                      </div>
                      <a
                        href={buildMapsUrl(client)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
                        title="Abrir Maps"
                      >
                        <MapPin />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Sheet>
      ) : null}

      {receiptDetail ? (
        <ReceiptSheet
          receipt={receiptDetail}
          onClose={() => setReceiptDetail(null)}
        />
      ) : null}

      {loadOpen ? (
        <Sheet title="Carga total de hoy" onClose={() => setLoadOpen(false)} position="center">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Estimado por consumo habitual
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-center">
                <div className="rounded-2xl bg-white px-4 py-6">
                  <p className="text-xs font-semibold text-slate-500">Bidones</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {loadTotals.water}
                  </p>
                </div>
                <div className="rounded-2xl bg-white px-4 py-6">
                  <p className="text-xs font-semibold text-slate-500">Soda</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">
                    {loadTotals.soda}
                  </p>
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500">
              Basado en el consumo habitual configurado en cada cliente.
            </p>
          </div>
        </Sheet>
      ) : null}

      {whatsappClient ? (
        <Sheet
          title="WhatsApp"
          onClose={() => setWhatsappClient(null)}
          position="center"
        >
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Mensaje rapido para{" "}
              <span className="font-semibold text-slate-900">
                {whatsappClient.name}
              </span>
            </p>
            {[
              "Estoy en la puerta.",
              "Estoy llegando en 5 min.",
              `Te dejé el pedido, tu saldo es $${Number(
                whatsappClient.balanceMoney ?? 0
              ).toFixed(0)}.`,
            ].map((msg) => (
              <button
                key={msg}
                type="button"
                onClick={() => {
                  const url = buildWhatsAppUrl(whatsappClient.phone, msg);
                  if (url) window.open(url, "_blank", "noopener,noreferrer");
                  setWhatsappClient(null);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-300"
              >
                {msg}
              </button>
            ))}
          </div>
        </Sheet>
      ) : null}

      <Toast message={toast} onClear={() => setToast("")} />
    </DriverLayout>
  );
}

function SortableClientCard({ client, index, onOpen, onWhatsApp }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={`cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-md shadow-slate-200/60 transition active:scale-[0.99] ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <button
              ref={setActivatorNodeRef}
              type="button"
              title="Mantener y arrastrar para reordenar"
              onClick={(e) => e.stopPropagation()}
              className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white shadow-sm touch-none"
              {...attributes}
              {...listeners}
            >
              {index + 1}
            </button>
            <p className="truncate text-base font-semibold text-slate-900">
              {client.name}
            </p>
          </div>
          <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-600">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${(() => {
                const status = waterStatus(client);
                if (status === "green") return "bg-emerald-500";
                if (status === "yellow") return "bg-amber-400";
                if (status === "red") return "bg-rose-500";
                return "bg-slate-300";
              })()}`}
              title="Estado de agua"
            />
            <span className="truncate">{client.address}</span>
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span>Deuda: ${Number(client.balanceMoney ?? 0).toFixed(0)}</span>
            <span className="text-slate-500">
              Envases: {Number(client.balanceBottles ?? 0)}
            </span>
            <span className="text-slate-500">
              🚰 {Number(client.dispenserCount ?? 0)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={buildMapsUrl(client)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            title="Abrir Maps"
          >
            <MapPin size={20} className="text-slate-600" />
          </a>
          {client.phone ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp?.(client);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
              title="WhatsApp"
            >
              <MessageCircle size={20} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReceiptSheet({ receipt, onClose }) {
  const status = receipt?.status;
  const client = receipt?.client || {};

  return (
    <Sheet title="Resumen" onClose={onClose} position="center">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">
                {client.name || "Cliente"}
              </p>
              <p className="mt-1 text-sm text-slate-600">{client.address}</p>
            </div>
            {receipt?.source === "offroute" ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                Fuera de ruta
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Estado:{" "}
            <span
              className={
                status === "Completada" ? "text-emerald-700" : "text-rose-700"
              }
            >
              {status === "Completada" ? "Entregado" : "No estaba"}
            </span>
          </p>
        </div>

        {status === "Completada" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Ticket
            </p>
            <div className="mt-3 space-y-3">
              <div className="space-y-1 text-sm text-slate-700">
                {(receipt?.items || []).map((it, idx) => (
                  <div
                    key={`${it.name}-${idx}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">
                      {it.qtyDelivered}x {it.name}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-800">
                      ${Number(it.qtyDelivered) * Number(it.priceUnit)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">Total</p>
                  <p className="font-semibold text-slate-900">
                    ${Number(receipt?.totalPrice ?? 0).toFixed(0)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">Pago</p>
                  <p className="font-semibold text-slate-900">
                    ${Number(receipt?.paymentAmount ?? 0).toFixed(0)}{" "}
                    <span className="text-xs font-semibold text-slate-500">
                      ({receipt?.paymentMethod || "-"})
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-500">
                  Nuevo saldo
                </p>
                <p className="font-semibold text-slate-900">
                  ${Number(receipt?.newBalanceMoney ?? 0).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <a
            href={buildMapsUrl(client)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            <MapPin size={18} />
            Maps
          </a>
          {client.phone ? (
            <a
              href={buildWhatsAppUrl(client.phone)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 shadow-sm"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}

function DeliverySheet({
  client,
  driverId,
  products,
  loadingProducts,
  onClose,
  onDone,
  onError,
}) {
  const [qtyById, setQtyById] = useState({});
  const deliveredTotal = useMemo(() => {
    return Object.values(qtyById).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }, [qtyById]);

  const [returned, setReturned] = useState(String(deliveredTotal));
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [saving, setSaving] = useState(false);
  const [debtConfirm, setDebtConfirm] = useState(false);

  useEffect(() => {
    setReturned(String(deliveredTotal));
  }, [deliveredTotal]);

  const items = useMemo(() => {
    return products
      .filter((p) => Number(qtyById[p.id] || 0) > 0)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        qtyDelivered: Number(qtyById[p.id] || 0),
        qtyReturned: 0,
        priceUnit: Number(p.price ?? 0),
        isInfiniteStock: Boolean(p.isInfiniteStock),
        isWater: Boolean(p.isWater),
      }));
  }, [products, qtyById]);

  const totalPrice = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.qtyDelivered * item.priceUnit,
      0
    );
  }, [items]);

  const prevMoney = Number(client.balanceMoney ?? 0);
  const prevBottles = Number(client.balanceBottles ?? 0);
  const pay = Number(paymentAmount || 0);
  const returnedNum = Number(returned || 0);
  const nextMoney = prevMoney + (totalPrice - pay);
  const nextBottles = prevBottles + (deliveredTotal - returnedNum);
  const isCriticalDebt = prevMoney > CRITICAL_DEBT_LIMIT;

  const setQty = (id, qty) => {
    setQtyById((prev) => ({ ...prev, [id]: qty }));
  };

  const handleConfirm = async () => {
    if (!driverId) {
      onError("No hay sesión de repartidor.");
      return;
    }

    if (isCriticalDebt && !debtConfirm) {
      onError("Debes confirmar la deuda alta antes de continuar.");
      return;
    }

    if (items.length === 0) {
      onError("Agregá al menos 1 producto.");
      return;
    }

    setSaving(true);
    try {
      const enrichedItems = items.map((item) => ({
        ...item,
        qtyReturned: returnedNum,
      }));
      await confirmDelivery({
        clientId: client.id,
        driverId,
        items: enrichedItems,
        paymentAmount: pay,
        paymentMethod,
      });
      onDone(client.id, "Completada", {
        items: enrichedItems.map((item) => ({
          name: item.name,
          qtyDelivered: Number(item.qtyDelivered),
          qtyReturned: Number(item.qtyReturned),
          priceUnit: Number(item.priceUnit),
        })),
        totalPrice,
        paymentAmount: pay,
        paymentMethod,
        newBalanceMoney: nextMoney,
      });
    } catch (error) {
      console.error(error);
      onError(error?.message || "No se pudo confirmar la entrega.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!driverId) {
      onError("No hay sesión de repartidor.");
      return;
    }

    if (!window.confirm("Marcar como 'No estaba / Omitir'?")) return;

    setSaving(true);
    try {
      await skipVisit({ clientId: client.id, driverId });
      onDone(client.id, "Fallida", {
        items: [],
        totalPrice: 0,
        paymentAmount: 0,
        paymentMethod: null,
        newBalanceMoney: prevMoney,
      });
    } catch (error) {
      console.error(error);
      onError("No se pudo registrar la visita fallida.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title={client.name} onClose={onClose}>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{client.address}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
          <div className="rounded-2xl bg-white px-3 py-2 text-slate-700">
            Deuda actual: ${prevMoney.toFixed(0)}
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-slate-700">
            Envases actuales: {prevBottles}
          </div>
        </div>
        {isCriticalDebt ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            ⚠ Deuda alta: ${prevMoney.toFixed(0)}
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Productos</h3>
            <p className="text-xs text-slate-500">Seleccioná cantidades.</p>
          </div>
          <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            Total: ${totalPrice.toFixed(0)}
          </div>
        </div>

        {loadingProducts ? (
          <p className="text-sm text-slate-500">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-500">No hay productos activos.</p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const qty = Number(qtyById[product.id] || 0);
              return (
                <div
                  key={product.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        ${Number(product.price ?? 0).toFixed(0)}{" "}
                        {product.isInfiniteStock
                          ? "(stock ∞)"
                          : `(stock ${product.stock ?? 0})`}
                      </p>
                    </div>
                    <QtyStepper
                      value={qty}
                      onChange={(v) => setQty(product.id, v)}
                      max={
                        product.isInfiniteStock
                          ? null
                          : Number(product.stock ?? 0)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Envases</h3>
        <label className="block text-sm font-medium text-slate-700">
          Envases devueltos
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={returned}
            onChange={(e) => setReturned(e.target.value)}
          />
        </label>
        <p className="text-xs font-semibold text-slate-500">
          Saldo envases luego: <span className="text-slate-900">{nextBottles}</span>
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Pago</h3>
        <Input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="Entrega ($)"
        />
        <p className="text-sm font-medium text-slate-700">Abona con</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("Efectivo")}
            className={`min-h-[52px] rounded-2xl border px-4 text-sm font-semibold transition ${
              paymentMethod === "Efectivo"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Efectivo
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("Transferencia")}
            className={`min-h-[52px] rounded-2xl border px-4 text-sm font-semibold transition ${
              paymentMethod === "Transferencia"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Transferencia
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">Total pedido</p>
          <p className="text-sm font-semibold text-slate-900">
            ${totalPrice.toFixed(0)}
          </p>
          <div className="mt-2 rounded-xl bg-white px-3 py-2 text-center">
            <p className="text-xs font-semibold text-slate-500">Saldo final</p>
            <p
              className={`text-xl font-semibold ${
                nextMoney > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              ${nextMoney.toFixed(0)}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {isCriticalDebt ? (
          <label className="flex items-start gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={debtConfirm}
              onChange={(e) => setDebtConfirm(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-900"
            />
            Confirmo que el cliente tiene deuda alta y autorizo la entrega.
          </label>
        ) : null}
        <Button onClick={handleConfirm} disabled={saving}>
          {saving ? "Procesando..." : "Confirmar entrega"}
        </Button>
        <div className="h-2" />
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-base font-semibold text-slate-600 shadow-sm"
        >
          No estaba / Omitir
        </button>
      </div>
    </Sheet>
  );
}
