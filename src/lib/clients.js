import { toDate } from "./dates";

const DEFAULT_CYCLE_DAYS = 7;
const DAY_MS = 1000 * 60 * 60 * 24;

// Semáforo de agua según días desde la última entrega de agua y el ciclo de consumo.
export function waterStatus(client) {
  const cycle = Number(client?.consumptionCycle ?? DEFAULT_CYCLE_DAYS);
  const safeCycle = Number.isFinite(cycle) && cycle > 0 ? cycle : DEFAULT_CYCLE_DAYS;
  const last = toDate(client?.lastWaterDate);
  if (!last) return "neutral";
  const days = (Date.now() - last.getTime()) / DAY_MS;
  if (days < safeCycle * 0.5) return "green";
  if (days < safeCycle) return "yellow";
  return "red";
}

export const WATER_STATUS_RANK = { neutral: 0, green: 1, yellow: 2, red: 3 };

export const WATER_STATUS_DOT = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-rose-500",
  neutral: "bg-slate-300",
};

export function buildMapsUrl(client) {
  const coords = client?.coords;
  const query =
    coords?.lat != null && coords?.lng != null
      ? `${coords.lat},${coords.lng}`
      : client?.address ?? "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function matchesClientQuery(client, normalizedQuery) {
  const haystack = `${client?.name ?? ""} ${client?.address ?? ""} ${
    client?.phone ?? ""
  }`.toLowerCase();
  return haystack.includes(normalizedQuery);
}

export function formatMoney(value) {
  return `$${Number(value ?? 0).toFixed(0)}`;
}
