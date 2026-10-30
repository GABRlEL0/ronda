export default function QtyStepper({ value, onChange, max }) {
  const maxValue = Number.isFinite(max) ? max : null;
  const canInc = maxValue == null || value < maxValue;

  const handleDirectInput = (event) => {
    const raw = event.target.value;
    if (raw === "") {
      onChange(0);
      return;
    }

    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;

    const next =
      maxValue == null ? Math.max(0, parsed) : Math.min(maxValue, Math.max(0, parsed));
    onChange(next);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-xl font-semibold text-slate-700 shadow-sm active:scale-[0.98]"
      >
        -
      </button>
      <input
        type="number"
        min="0"
        max={maxValue ?? undefined}
        step="1"
        inputMode="numeric"
        value={value}
        onChange={handleDirectInput}
        onFocus={(event) => event.target.select()}
        className="h-12 w-20 rounded-2xl border border-slate-200 bg-white px-2 text-center text-xl font-semibold text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
        aria-label="Cantidad"
      />
      <button
        type="button"
        onClick={() =>
          onChange(maxValue == null ? value + 1 : Math.min(maxValue, value + 1))
        }
        disabled={!canInc}
        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl font-semibold shadow-sm active:scale-[0.98] ${
          canInc
            ? "bg-slate-900 text-white"
            : "bg-slate-200 text-slate-400"
        }`}
      >
        +
      </button>
    </div>
  );
}
