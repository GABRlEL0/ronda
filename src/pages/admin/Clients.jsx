import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import {
  createClient,
  deleteClient,
  listenClients,
  updateClient,
} from "../../services/clients";
import { getClientRouteDays, ROUTE_DAYS } from "../../lib/days";
import { WATER_STATUS_DOT, WATER_STATUS_RANK, waterStatus } from "../../lib/clients";

const DAY_ORDER = Object.fromEntries(ROUTE_DAYS.map((day, idx) => [day, idx]));

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  routeDays: [ROUTE_DAYS[0]],
  balanceMoney: "0",
  balanceAdjustType: "debt",
  balanceAdjustAmount: "",
  balanceBottles: "0",
  dispenserCount: "0",
  consumptionCycle: "7",
  defaultLoadWater: "0",
  defaultLoadSoda: "0",
};

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// El saldo $ es deuda: positivo = el cliente debe. Un pago la reduce.
function balanceDeltaFromForm(form) {
  const amount = Math.abs(toNumber(form.balanceAdjustAmount));
  return form.balanceAdjustType === "payment" ? -amount : amount;
}

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [search, setSearch] = useState("");
  const [requestedPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    const unsubscribe = listenClients(
      (items) => {
        setClients(items);
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setToast("No se pudieron cargar los clientes.");
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (client) => {
    setEditing(client);
    setForm({
      name: client.name ?? "",
      address: client.address ?? "",
      phone: client.phone ?? "",
      routeDays: getClientRouteDays(client).length
        ? getClientRouteDays(client)
        : [ROUTE_DAYS[0]],
      balanceMoney: client.balanceMoney ?? 0,
      balanceAdjustType: "payment",
      balanceAdjustAmount: "",
      balanceBottles: client.balanceBottles ?? 0,
      dispenserCount: client.dispenserCount ?? 0,
      consumptionCycle: client.consumptionCycle ?? 7,
      defaultLoadWater: client.defaultLoad?.water ?? 0,
      defaultLoadSoda: client.defaultLoad?.soda ?? 0,
    });
    setOpen(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Campos que edita el formulario. NO incluye routeOrder, lastOrderDate ni
  // lastWaterDate: esos los mantiene la operación y no deben pisarse al editar.
  const buildFormFields = () => {
    const routeDays =
      Array.isArray(form.routeDays) && form.routeDays.length > 0
        ? form.routeDays
        : [ROUTE_DAYS[0]];
    return {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      routeDays,
      routeDay: routeDays[0],
      dispenserCount: toNumber(form.dispenserCount),
      consumptionCycle: toNumber(form.consumptionCycle, 7),
      defaultLoad: {
        water: toNumber(form.defaultLoadWater),
        soda: toNumber(form.defaultLoadSoda),
      },
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const fields = buildFormFields();
    if (!fields.name || !fields.address) {
      setToast("Nombre y dirección son obligatorios.");
      return;
    }

    const balanceDelta = balanceDeltaFromForm(form);
    const balanceBottles = toNumber(form.balanceBottles);

    try {
      if (editing) {
        const update = { ...fields };
        // Sólo escribir envases si el admin los cambió (evita pisar una entrega
        // registrada mientras el formulario estaba abierto).
        if (balanceBottles !== toNumber(editing.balanceBottles)) {
          update.balanceBottles = balanceBottles;
        }
        await updateClient(editing.id, update, { balanceDelta });
        setToast("Cliente actualizado.");
      } else {
        await createClient({
          ...fields,
          routeOrder: 9999,
          balanceMoney: toNumber(form.balanceMoney) + balanceDelta,
          balanceBottles,
          lastOrderDate: null,
          lastWaterDate: null,
        });
        setToast("Cliente creado.");
      }
      setOpen(false);
    } catch (error) {
      console.error(error);
      setToast("No se pudo guardar el cliente.");
    }
  };

  const handleDelete = async (client) => {
    if (!window.confirm(`Eliminar ${client.name}?`)) return;
    try {
      await deleteClient(client.id);
      setToast("Cliente eliminado.");
    } catch (error) {
      console.error(error);
      setToast("No se pudo eliminar.");
    }
  };

  const sortedClients = useMemo(() => {
    const items = [...clients];
    const dir = sort.dir === "asc" ? 1 : -1;
    items.sort((a, b) => {
      switch (sort.key) {
        case "name":
          return String(a.name || "").localeCompare(String(b.name || "")) * dir;
        case "routeDay": {
          const minIndex = (client) => {
            const days = getClientRouteDays(client);
            if (!days.length) return Number.POSITIVE_INFINITY;
            return Math.min(
              ...days.map((d) => DAY_ORDER[d] ?? Number.POSITIVE_INFINITY)
            );
          };
          return (minIndex(a) - minIndex(b)) * dir;
        }
        case "balanceMoney":
          return (Number(a.balanceMoney ?? 0) - Number(b.balanceMoney ?? 0)) * dir;
        case "dispenserCount":
          return (Number(a.dispenserCount ?? 0) - Number(b.dispenserCount ?? 0)) * dir;
        case "status":
          return (
            (WATER_STATUS_RANK[waterStatus(a)] - WATER_STATUS_RANK[waterStatus(b)]) * dir
          );
        default:
          return 0;
      }
    });
    return items;
  }, [clients, sort]);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return sortedClients;
    return sortedClients.filter((client) =>
      String(client?.name ?? "").toLowerCase().includes(query)
    );
  }, [search, sortedClients]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  // Si la lista se achica (búsqueda, borrado) la página se ajusta sola.
  const page = Math.min(requestedPage, totalPages);

  const paginatedClients = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredClients.slice(start, start + pageSize);
  }, [filteredClients, page, pageSize]);

  const toggleSort = (key) => {
    setSort((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  };

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-xl">
          <h2 className="text-2xl font-semibold text-slate-900">Clientes</h2>
          <p className="text-sm text-slate-500">
            Administrá rutas, saldos, comodatos y datos de contacto.
          </p>
        </div>
        <Button
          className="w-[170px] min-h-0 h-10 rounded-2xl px-4 text-sm bg-amber-500 text-white hover:bg-amber-400"
          onClick={openCreate}
        >
          Nuevo cliente
        </Button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" />
              </svg>
            </span>
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar cliente por nombre"
              className="h-10 rounded-xl py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
            Por pagina
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("status")}
                    className="flex items-center gap-1 text-left"
                  >
                    Estado
                    <span className="text-[10px]">
                      {sort.key === "status" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                    className="flex items-center gap-1 text-left"
                  >
                    Nombre
                    <span className="text-[10px]">
                      {sort.key === "name" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3">Dirección</th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("routeDay")}
                    className="flex items-center gap-1 text-left"
                  >
                    Día
                    <span className="text-[10px]">
                      {sort.key === "routeDay" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleSort("balanceMoney")}
                    className="flex items-center gap-1 text-left"
                  >
                    Saldo
                    <span className="text-[10px]">
                      {sort.key === "balanceMoney" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => toggleSort("dispenserCount")}
                    className="flex items-center gap-1 text-left"
                  >
                    Dispensers
                    <span className="text-[10px]">
                      {sort.key === "dispenserCount" ? (sort.dir === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={7}>
                    Cargando clientes...
                  </td>
                </tr>
              ) : clients.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={7}>
                    Todavía no hay clientes.
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={7}>
                    No hay clientes que coincidan con la busqueda.
                  </td>
                </tr>
              ) : (
                paginatedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-3 w-3 rounded-full ${
                          WATER_STATUS_DOT[waterStatus(client)]
                        }`}
                        title="Estado de agua"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {client.name}
                    </td>
                    <td className="px-4 py-3">{client.address}</td>
                    <td className="px-4 py-3">
                      {getClientRouteDays(client).join(", ")}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                      ${Number(client.balanceMoney ?? 0).toFixed(0)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-600">
                        🚰 {Number(client.dispenserCount ?? 0)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(client)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(client)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filteredClients.length > 0 ? (
          <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Mostrando {Math.min((page - 1) * pageSize + 1, filteredClients.length)}-
              {Math.min(page * pageSize, filteredClients.length)} de {filteredClients.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Anterior
              </button>
              <span className="text-xs font-semibold text-slate-500">
                Pagina {page} de {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {open ? (
        <Modal
          title={editing ? "Editar cliente" : "Nuevo cliente"}
          onClose={() => setOpen(false)}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Dirección
              <Input
                name="address"
                value={form.address}
                onChange={handleChange}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Teléfono
              <Input name="phone" value={form.phone} onChange={handleChange} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Días de visita
              <div className="mt-2 flex flex-wrap gap-2">
                {ROUTE_DAYS.map((day) => {
                  const active = form.routeDays?.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setForm((prev) => {
                          const next = new Set(prev.routeDays || []);
                          if (next.has(day)) {
                            next.delete(day);
                          } else {
                            next.add(day);
                          }
                          return {
                            ...prev,
                            routeDays: Array.from(next),
                          };
                        })
                      }
                      className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Saldo $ actual
                <Input
                  name="balanceMoney"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.balanceMoney}
                  onChange={handleChange}
                  disabled
                />
              </label>
              <div className="block text-sm font-medium text-slate-700">
                {editing ? "Ajuste de saldo" : "Saldo inicial"}
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {[
                    { value: "debt", label: "Cargar deuda" },
                    { value: "payment", label: "Registrar pago" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, balanceAdjustType: opt.value }))
                      }
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        form.balanceAdjustType === opt.value
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Input
                  name="balanceAdjustAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Monto ($)"
                  value={form.balanceAdjustAmount}
                  onChange={handleChange}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Saldo resultante:{" "}
                  <span className="font-semibold text-slate-900">
                    ${(toNumber(form.balanceMoney) + balanceDeltaFromForm(form)).toFixed(0)}
                  </span>{" "}
                  (positivo = debe)
                </span>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                Saldo envases
                <Input
                  name="balanceBottles"
                  type="number"
                  step="1"
                  inputMode="numeric"
                  value={form.balanceBottles}
                  onChange={handleChange}
                />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Dispensers en comodato
              <Input
                name="dispenserCount"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.dispenserCount}
                onChange={handleChange}
              />
              <span className="mt-1 block text-xs text-slate-500">
                Registro interno de comodato.
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Ciclo de consumo (dias)
              <Input
                name="consumptionCycle"
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.consumptionCycle}
                onChange={handleChange}
              />
              <span className="mt-1 block text-xs text-slate-500">
                Define cada cuántos días vuelve a comprar.
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Consumo habitual - Bidones
                <Input
                  name="defaultLoadWater"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.defaultLoadWater}
                  onChange={handleChange}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Consumo habitual - Soda
                <Input
                  name="defaultLoadSoda"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.defaultLoadSoda}
                  onChange={handleChange}
                />
              </label>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" className="sm:w-auto sm:px-6">
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="sm:w-auto sm:px-6"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      <Toast message={toast} onClear={() => setToast("")} />
    </section>
  );
}
