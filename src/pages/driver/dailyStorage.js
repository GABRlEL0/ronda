import { useCallback, useEffect, useState } from "react";
import { toYmd } from "../../lib/dates";

// Estado local del repartidor que vive sólo durante el día (visitados, fuera de
// ruta, tickets). Se guarda en localStorage con la fecha en la clave.
const PREFIX = "ronda:";
const DAILY_NAMES = ["visited", "offroute", "receipts"];
const CHECK_INTERVAL_MS = 60 * 1000;

function storageKey(name, dateKey) {
  return `${PREFIX}${name}:${dateKey}`;
}

function read(name, dateKey, fallback) {
  try {
    const raw = localStorage.getItem(storageKey(name, dateKey));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(name, dateKey, value) {
  try {
    localStorage.setItem(storageKey(name, dateKey), JSON.stringify(value));
  } catch {
    // Sin espacio o modo privado: el estado sigue en memoria.
  }
}

// Borra claves de días anteriores para que localStorage no crezca sin límite.
export function pruneOldDailyEntries(todayKey) {
  try {
    const stale = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      const match = /^ronda:([a-z]+):(\d{4}-\d{2}-\d{2})$/.exec(key ?? "");
      if (match && DAILY_NAMES.includes(match[1]) && match[2] < todayKey) {
        stale.push(key);
      }
    }
    stale.forEach((key) => localStorage.removeItem(key));
  } catch {
    // ignore
  }
}

// Fecha de hoy (YYYY-MM-DD) que se actualiza al pasar la medianoche o al
// volver a la app, para no arrastrar el estado del día anterior.
export function useTodayKey() {
  const [todayKey, setTodayKey] = useState(() => toYmd(new Date()));

  useEffect(() => {
    const refresh = () => setTodayKey(toYmd(new Date()));
    const interval = setInterval(refresh, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    pruneOldDailyEntries(todayKey);
  }, [todayKey]);

  return todayKey;
}

// useState persistido por día. Al cambiar `dateKey` carga el estado de ese día.
export function useDailyState(name, dateKey, fallback) {
  const [state, setState] = useState(() => ({
    dateKey,
    value: read(name, dateKey, fallback),
  }));

  let current = state;
  if (state.dateKey !== dateKey) {
    current = { dateKey, value: read(name, dateKey, fallback) };
    setState(current);
  }

  useEffect(() => {
    write(name, state.dateKey, state.value);
  }, [name, state]);

  const setValue = useCallback((updater) => {
    setState((prev) => ({
      ...prev,
      value: typeof updater === "function" ? updater(prev.value) : updater,
    }));
  }, []);

  return [current.value, setValue];
}
