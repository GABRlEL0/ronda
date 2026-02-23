import { useEffect, useMemo, useState } from "react";
import Toast from "../../components/ui/Toast";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { listenUsers, setUserActive } from "../../services/users";
import { createInvite, listenPendingInvites } from "../../services/invites";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [invites, setInvites] = useState([]);
  const [toast, setToast] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("driver");
  const [saving, setSaving] = useState(false);

  const registerLink = useMemo(() => {
    if (typeof window === "undefined") return "";
    const base = import.meta.env.BASE_URL || "/";
    return `${window.location.origin}${base}register`;
  }, []);

  useEffect(() => {
    const unsubUsers = listenUsers(setUsers);
    const unsubInvites = listenPendingInvites(setInvites);
    return () => {
      unsubUsers();
      unsubInvites();
    };
  }, []);

  const activeUsers = useMemo(
    () => users.filter((u) => u.active !== false),
    [users]
  );
  const inactiveUsers = useMemo(
    () => users.filter((u) => u.active === false),
    [users]
  );

  const handleInvite = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createInvite({ email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      setToast("Pendiente creado.");
    } catch (err) {
      console.error(err);
      setToast(err?.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (uid, next) => {
    try {
      await setUserActive(uid, next);
      setToast(next ? "Usuario activado." : "Usuario desactivado.");
    } catch (err) {
      console.error(err);
      setToast("No se pudo actualizar el usuario.");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Usuarios</h2>
        <p className="text-sm text-slate-500">
          Generá el registro y compartí el link con el usuario.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Usuarios activos</h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Rol</th>
                  <th className="px-3 py-2 text-right">Accion</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-slate-500" colSpan={3}>
                      No hay usuarios activos.
                    </td>
                  </tr>
                ) : (
                  activeUsers.map((u) => (
                    <tr key={u.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {u.email}
                      </td>
                      <td className="px-3 py-2 text-slate-700">{u.role}</td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => toggleActive(u.id, false)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:border-rose-300"
                        >
                          Desactivar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {inactiveUsers.length ? (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-slate-700">
                Desactivados
              </h4>
              <div className="mt-2 space-y-2">
                {inactiveUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-700">
                        {u.email}
                      </p>
                      <p className="text-xs text-slate-500">{u.role}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleActive(u.id, true)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
                    >
                      Activar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Nuevo usuario
          </h3>

          <form onSubmit={handleInvite} className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nuevo@usuario.com"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Rol
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <Button type="submit" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </form>

          <div className="mt-6">
            <h4 className="text-sm font-semibold text-slate-700">Pendientes</h4>
            {invites.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No hay registros pendientes.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {invites.map((inv) => (
                  <div
                    key={inv.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {inv.email}
                        </p>
                        <p className="text-xs text-slate-500">
                          Rol: {inv.role}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          Válido hasta las 00:00.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(registerLink);
                            setToast("Link copiado.");
                          } catch {
                            setToast("No se pudo copiar el link.");
                          }
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
                      >
                        Copiar link
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      Link de registro: {registerLink || "/register"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast message={toast} onClear={() => setToast("")} />
    </section>
  );
}
