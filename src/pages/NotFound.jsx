import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-5">
      <div className="text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
          404
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Página no encontrada
        </h1>
        <Link
          to="/"
          className="mt-4 inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
