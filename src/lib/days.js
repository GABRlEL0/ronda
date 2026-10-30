// Nombres de día tal como se guardan en Firestore (clients.routeDays / routeDay).
// Indexado igual que Date#getDay(): 0 = Domingo.
export const WEEK_DAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

export const WEEK_DAY_INITIALS = ["D", "L", "M", "X", "J", "V", "S"];

// Orden de semana laboral (Lunes primero) para Admin.
export const ROUTE_DAYS = [...WEEK_DAYS.slice(1), WEEK_DAYS[0]];

export function getClientRouteDays(client) {
  if (Array.isArray(client?.routeDays) && client.routeDays.length > 0) {
    return client.routeDays;
  }
  return client?.routeDay ? [client.routeDay] : [];
}

// Orden del cliente dentro de un día. Clientes con varios días tienen un orden
// independiente por día en `routeOrderByDay`; si no existe, se usa `routeOrder`.
export function getRouteOrder(client, day) {
  const byDay = client?.routeOrderByDay?.[day];
  if (Number.isFinite(byDay)) return byDay;
  const legacy = Number(client?.routeOrder);
  return Number.isFinite(legacy) ? legacy : Number.MAX_SAFE_INTEGER;
}
