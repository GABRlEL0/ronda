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

const DAYS = [
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
  "Domingo",
];
const DAY_ORDER = DAYS.reduce((acc, day, idx) => {
  acc[day] = idx;
  return acc;
}, {});

const emptyForm = {
  name: "",
  address: "",
  phone: "",
  routeDays: [DAYS[0]],
  balanceMoney: "0",
  balanceDelta: "0",
  balanceBottles: "0",
  dispenserCount: "0",
  consumptionCycle: "7",
  defaultLoadWater: "0",
  defaultLoadSoda: "0",
};

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

export default function AdminClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState("");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });

  useEffect(() => {
    const unsubscribe = listenClients((items) => {
      setClients(items);
      setLoading(false);
    });
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
      routeDays:
        client.routeDays && client.routeDays.length > 0
          ? client.routeDays
          : [client.routeDay ?? DAYS[0]],
      balanceMoney: client.balanceMoney ?? 0,
      balanceDelta: "0",
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

  const payload = useMemo(() => {
    const moneyValue = Number(form.balanceMoney);
    const deltaValue = Number(form.balanceDelta);
    const bottlesValue = Number(form.balanceBottles);
    const dispenserCountValue = Number(form.dispenserCount);
    const cycleValue = Number(form.consumptionCycle);
    const loadWater = Number(form.defaultLoadWater);
    const loadSoda = Number(form.defaultLoadSoda);
    const routeDaysValue =
      Array.isArray(form.routeDays) && form.routeDays.length > 0
        ? form.routeDays
        : [DAYS[0]];

    const currentMoney = Number.isNaN(moneyValue) ? 0 : moneyValue;
    const deltaMoney = Number.isNaN(deltaValue) ? 0 : deltaValue;

    return {
      name: form.name.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
      routeDays: routeDaysValue,
      routeDay: routeDaysValue[0],
      routeOrder: 9999,
      balanceMoney: currentMoney + deltaMoney,
      balanceBottles: Number.isNaN(bottlesValue) ? 0 : bottlesValue,
      dispenserCount: Number.isNaN(dispenserCountValue)
        ? 0
        : dispenserCountValue,
      lastOrderDate: null,
      lastWaterDate: null,
      consumptionCycle: Number.isNaN(cycleValue) ? 7 : cycleValue,
      defaultLoad: {
        water: Number.isNaN(loadWater) ? 0 : loadWater,
        soda: Number.isNaN(loadSoda) ? 0 : loadSoda,
      },
    };
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!payload.name || !payload.address) {
      setToast("Nombre y dirección son obligatorios.");
      return;
    }

    try {
      if (editing) {
        await updateClient(editing.id, payload);
        setToast("Cliente actualizado.");
      } else {
        await createClient(payload);
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
            const days = client.routeDays?.length
              ? client.routeDays
              : client.routeDay
              ? [client.routeDay]
              : [];
            if (!days.length) return Number.POSITIVE_INFINITY;
            return Math.min(
              ...days.map((d) => DAY_ORDER[d] ?? Number.POSITIVE_INFINITY)
            );
          };
          const aIdx = minIndex(a);
          const bIdx = minIndex(b);
          return (aIdx - bIdx) * dir;
        }
        case "balanceMoney":
          return (Number(a.balanceMoney ?? 0) - Number(b.balanceMoney ?? 0)) * dir;
        case "dispenserCount":
          return (Number(a.dispenserCount ?? 0) - Number(b.dispenserCount ?? 0)) * dir;
        case "status": {
          const rank = (client) => {
            const s = waterStatus(client);
            if (s === "red") return 3;
            if (s === "yellow") return 2;
            if (s === "green") return 1;
            return 0;
          };
          return (rank(a) - rank(b)) * dir;
        }
        default:
          return 0;
      }
    });
    return items;
  }, [clients, sort]);

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
              ) : (
                sortedClients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex h-3 w-3 rounded-full ${(() => {
                          const status = waterStatus(client);
                          if (status === "green") return "bg-emerald-500";
                          if (status === "yellow") return "bg-amber-400";
                          if (status === "red") return "bg-rose-500";
                          return "bg-slate-300";
                        })()}`}
                        title="Estado de agua"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {client.name}
                    </td>
                    <td className="px-4 py-3">{client.address}</td>
                    <td className="px-4 py-3">
                      {(client.routeDays && client.routeDays.length > 0
                        ? client.routeDays
                        : [client.routeDay]).filter(Boolean).join(", ")}
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
                {DAYS.map((day) => {
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
              <label className="block text-sm font-medium text-slate-700">
                Ajuste de saldo
                <Input
                  name="balanceDelta"
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={form.balanceDelta}
                  onChange={handleChange}
                />
                <span className="mt-1 block text-xs text-slate-500">
                  Positivo si paga, negativo si se carga deuda inicial.
                </span>
              </label>
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
