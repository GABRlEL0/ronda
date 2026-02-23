export default function Brand({ variant = "driver" }) {
  const isDriver = variant === "driver";
  const accent = isDriver ? "from-emerald-500 to-sky-500" : "from-slate-900 to-slate-600";

  return (
    <div className="flex items-center gap-3">
      <div
        className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-sm`}
        aria-hidden="true"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 14c3-6 6 6 9 0s6 6 7 2"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M6.2 6.5h7.2c2.4 0 4.4 2 4.4 4.4v6.6"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
          Ronda {isDriver ? "Driver" : "Admin"}
        </p>
      </div>
    </div>
  );
}
