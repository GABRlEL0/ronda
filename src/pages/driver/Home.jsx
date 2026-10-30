import { useMemo, useState, useEffect } from "react";
import { MapPin, Search } from "lucide-react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import DriverLayout from "../../components/layout/DriverLayout";
import Input from "../../components/ui/Input";
import Toast from "../../components/ui/Toast";
import { listenClientsByDay, saveRouteOrderBatch } from "../../services/routes";
import { listenActiveProducts } from "../../services/products";
import { listenAllClients } from "../../services/clients";
import { useAuth } from "../../auth/authContext";
import { buildWhatsAppUrl } from "../../lib/whatsapp";
import { WEEK_DAY_INITIALS, WEEK_DAYS } from "../../lib/days";
import { parseYmd } from "../../lib/dates";
import { buildMapsUrl, formatMoney, matchesClientQuery } from "../../lib/clients";
import { useDailyState, useTodayKey } from "./dailyStorage";
import ClientCard, { SortableClientCard } from "./components/ClientCard";
import DeliverySheet from "./components/DeliverySheet";
import ReceiptSheet from "./components/ReceiptSheet";
import Sheet from "./components/Sheet";

export default function DriverHome() {
  const { user } = useAuth();
  const todayKey = useTodayKey();
  const todayIndex = parseYmd(todayKey).getDay();
  const [selectedDayIndex, setSelectedDayIndex] = useState(todayIndex);
  const day = WEEK_DAYS[selectedDayIndex];

  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedSource, setSelectedSource] = useState("route"); // route | offroute
  const [toast, setToast] = useState("");
  const [visited, setVisited] = useDailyState("visited", todayKey, {});
  const [showCompleted, setShowCompleted] = useState(false);
  const [dayFilter, setDayFilter] = useState("");
  const [savingOrder, setSavingOrder] = useState(false);
  const [offRouteOpen, setOffRouteOpen] = useState(false);
  const [offRouteQuery, setOffRouteQuery] = useState("");
  const [offRouteClients, setOffRouteClients] = useState([]);
  const [offRouteVisits, setOffRouteVisitsState] = useDailyState(
    "offroute",
    todayKey,
    []
  );
  const [receiptDetail, setReceiptDetail] = useState(null);
  const [receipts, setReceipts] = useDailyState("receipts", todayKey, {});
  const [syncing, setSyncing] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [whatsappClient, setWhatsappClient] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    const unsubscribe = listenClientsByDay(
      day,
      (items, hasPendingWrites) => {
        setClients(items);
        setLoadingClients(false);
        setSyncing(Boolean(hasPendingWrites));
      },
      () => setToast("No se pudo cargar la ruta.")
    );
    return () => unsubscribe();
  }, [day]);

  useEffect(() => {
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

  const pendingClients = useMemo(() => {
    return clients.filter((client) => !visited[client.id]);
  }, [clients, visited]);

  const completedClients = useMemo(() => {
    return clients.filter((client) => Boolean(visited[client.id]));
  }, [clients, visited]);

  const normalizedDayFilter = dayFilter.trim().toLowerCase();
  const isFilteringDayClients = normalizedDayFilter.length > 0;

  const visiblePendingClients = useMemo(() => {
    if (!isFilteringDayClients) return pendingClients;
    return pendingClients.filter((client) =>
      matchesClientQuery(client, normalizedDayFilter)
    );
  }, [pendingClients, isFilteringDayClients, normalizedDayFilter]);

  const visibleCompletedClients = useMemo(() => {
    if (!isFilteringDayClients) return completedClients;
    return completedClients.filter((client) =>
      matchesClientQuery(client, normalizedDayFilter)
    );
  }, [completedClients, isFilteringDayClients, normalizedDayFilter]);

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
    return offRouteClients.filter((client) => matchesClientQuery(client, q));
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
      await saveRouteOrderBatch(day, nextAll);
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
            {visiblePendingClients.length}/{clients.length}
          </div>
        </div>

        {/* Selector de día */}
        <div className="mt-4 flex justify-between gap-1">
          {WEEK_DAY_INITIALS.map((initial, idx) => {
            const isActive = idx === selectedDayIndex;
            const isToday = idx === todayIndex;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (idx === selectedDayIndex) return;
                  setLoadingClients(true);
                  setSelectedDayIndex(idx);
                }}
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

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <Search size={16} className="text-slate-400" />
            <input
              type="text"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              placeholder="Buscar cliente por nombre, direccion o telefono"
              className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="mt-5 space-y-3">
          {loadingClients ? (
            <p className="text-sm text-slate-500">Cargando ruta...</p>
          ) : visiblePendingClients.length === 0 ? (
            <p className="text-sm text-slate-500">
              {isFilteringDayClients
                ? "No hay clientes que coincidan con la busqueda."
                : "No hay clientes pendientes para hoy."}
            </p>
          ) : (
            isFilteringDayClients ? (
                <div className="space-y-3">
                  {visiblePendingClients.map((client) => (
                    <ClientCard
                      key={client.id}
                      client={client}
                      onOpen={() => openClient(client)}
                      onWhatsApp={(c) => setWhatsappClient(c)}
                    />
                  ))}
                </div>
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
              )
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
                {visibleCompletedClients.map((client) => (
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
                          if (e.key === "Enter" || e.key === " ") {
                            const r = receipts?.[item.clientId];
                            if (r) setReceiptDetail(r);
                          }
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
              `Te dejé el pedido, tu saldo es ${formatMoney(
                whatsappClient.balanceMoney
              )}.`,
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
