import { NavLink, Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "../../auth/authContext";

const navItems = [
  { to: "/admin/clientes", label: "Clientes" },
  { to: "/admin/productos", label: "Productos" },
  { to: "/admin/rondas", label: "Rondas" },
  { to: "/admin/reportes", label: "Reportes" },
  { to: "/admin/usuarios", label: "Usuarios" },
  { to: "/admin/dashboard", label: "Dashboard" },
  { to: "/driver", label: "Ir a Driver" },
];

export default function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
        <aside className="w-full border-b border-slate-200 bg-white md:w-64 md:border-b-0 md:border-r">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-6 py-5 md:flex-col md:items-start md:gap-8">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                Ronda Admin
              </p>
              <h1 className="text-xl font-semibold text-slate-900">
                Panel de control
              </h1>
            </div>
            </div>
            <nav className="flex flex-wrap gap-2 px-6 pb-6 md:flex-col">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto px-6 pb-6">
              <button
                type="button"
                onClick={signOut}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
              >
                <LogOut size={18} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-6 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
