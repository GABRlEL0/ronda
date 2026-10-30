import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { sendPasswordResetEmail } from "firebase/auth";
import { useAuth } from "../auth/authContext";
import { auth } from "../firebase/config";

export default function Login() {
  const navigate = useNavigate();
  const { signIn, user, role } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const handleResetPassword = async () => {
    setError("");
    setInfo("");
    const safeEmail = email.trim().toLowerCase();
    if (!safeEmail) {
      setError("Escribí tu email arriba y volvé a tocar \"¿Olvidaste tu contraseña?\".");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, safeEmail);
    } catch (err) {
      console.error(err);
      if (err?.code === "auth/invalid-email") {
        setError("El email no es válido.");
        return;
      }
      // Otros errores (ej. usuario inexistente) se muestran igual que el éxito
      // para no revelar qué emails están registrados.
    }
    setInfo(
      `Si ${safeEmail} tiene cuenta, te enviamos un email para crear una nueva contraseña. Revisá también la carpeta de spam.`
    );
  };

  useEffect(() => {
    if (user && role === "admin") {
      navigate("/admin", { replace: true });
    }
    if (user && role === "driver") {
      navigate("/driver", { replace: true });
    }
  }, [user, role, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError("Credenciales inválidas. Revisá el email y la contraseña.");
      console.error(err);
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
          <h1 className="text-2xl font-semibold text-slate-900">
            Iniciar sesión
          </h1>
          <p className="text-sm text-slate-500">
            Acceso rápido para administradores y repartidores.
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
            />
          </label>

          {info ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {info}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </Button>
          <button
            type="button"
            onClick={handleResetPassword}
            className="w-full text-center text-sm font-semibold text-slate-500 underline-offset-4 hover:text-slate-800 hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          Recordatorio: el rol se define en Firestore (colección users).
        </div>
      </div>
    </div>
  );
}
