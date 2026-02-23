import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  signOut,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { auth, db } from "../firebase/config";
import { getInviteByEmail, markInviteUsed } from "../services/invites";

export default function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const safeEmail = email.trim().toLowerCase();

    try {
      const cred = await createUserWithEmailAndPassword(auth, safeEmail, password);
      const uid = cred.user.uid;

      const invite = await getInviteByEmail(safeEmail);
      if (!invite || invite.used) {
        // Security by design: this should also be blocked by rules, but we fail fast.
        await deleteUser(cred.user).catch(() => {});
        await signOut(auth).catch(() => {});
        throw new Error("No hay invitacion valida para este email.");
      }

      await setDoc(doc(db, "users", uid), {
        uid,
        email: safeEmail,
        role: invite.role,
        active: true,
      });

      await markInviteUsed(safeEmail);

      navigate("/", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 px-5">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
            Ronda
          </p>
          <h1 className="text-2xl font-semibold text-slate-900">Registro</h1>
          <p className="text-sm text-slate-500">
            Solo con invitacion. Si no te invitaron, pedi acceso al administrador.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Email
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Contraseña
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? "Creando cuenta..." : "Crear cuenta"}
          </Button>
        </form>
      </div>
    </div>
  );
}

