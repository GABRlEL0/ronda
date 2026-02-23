import { useEffect } from "react";

export default function Toast({ message, onClear, variant = "success" }) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(onClear, 2400);
    return () => clearTimeout(timer);
  }, [message, onClear]);

  if (!message) return null;

  const styles =
    variant === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : "border-rose-200 bg-rose-50 text-rose-700";

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div
        className={`rounded-2xl border px-4 py-3 text-sm font-medium shadow-lg ${styles}`}
      >
        {message}
      </div>
    </div>
  );
}
