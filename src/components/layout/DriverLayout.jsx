import { Cloud, LogOut } from "lucide-react";
import { useAuth } from "../../auth/authContext";
import Brand from "../Brand";

function formatDriverHeaderDate(now) {
  const weekday = now.toLocaleDateString("es-AR", { weekday: "long" });
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const capWeekday = weekday ? weekday[0].toUpperCase() + weekday.slice(1) : "";

  return { weekday: capWeekday, date: `${day}/${month}/${yyyy}` };
}

export default function DriverLayout({ children, syncState = "ok" }) {
  const { signOut } = useAuth();
  const { weekday, date } = formatDriverHeaderDate(new Date());
  const syncing = syncState === "syncing";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <Brand variant="driver" />
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                {weekday}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
                {date}
              </p>
              <div className="mt-2 flex items-center justify-end gap-2 text-xs font-semibold text-slate-500">
                <Cloud
                  size={16}
                  className={syncing ? "text-amber-500" : "text-emerald-600"}
                />
                {syncing ? "Guardando..." : "Todo al día"}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-3xl flex-col px-5">
        <main className="flex flex-1 flex-col gap-6 py-6">{children}</main>
        <footer className="py-6">
          <button
            type="button"
            onClick={signOut}
            className="mx-auto flex min-h-[52px] w-full max-w-sm items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
          >
            <LogOut size={18} />
            Salir
          </button>
        </footer>
      </div>
    </div>
  );
}
