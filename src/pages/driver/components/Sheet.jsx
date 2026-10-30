export default function Sheet({ title, children, onClose, position = "bottom" }) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className={`absolute inset-x-0 max-h-[92vh] overflow-auto bg-white p-5 shadow-2xl ${
          position === "center"
            ? "top-1/2 -translate-y-1/2 rounded-[28px] mx-4"
            : "bottom-0 rounded-t-[28px]"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              Entrega
            </p>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
          >
            Cerrar
          </button>
        </div>
        <div className="mt-5 space-y-6">{children}</div>
      </div>
    </div>
  );
}
