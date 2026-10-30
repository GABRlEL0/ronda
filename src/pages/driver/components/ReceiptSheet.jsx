import { MapPin, MessageCircle } from "lucide-react";
import { buildMapsUrl, formatMoney } from "../../../lib/clients";
import { buildWhatsAppUrl } from "../../../lib/whatsapp";
import Sheet from "./Sheet";

export default function ReceiptSheet({ receipt, onClose }) {
  const status = receipt?.status;
  const client = receipt?.client || {};

  return (
    <Sheet title="Resumen" onClose={onClose} position="center">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold text-slate-900">
                {client.name || "Cliente"}
              </p>
              <p className="mt-1 text-sm text-slate-600">{client.address}</p>
            </div>
            {receipt?.source === "offroute" ? (
              <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                Fuera de ruta
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            Estado:{" "}
            <span
              className={
                status === "Completada" ? "text-emerald-700" : "text-rose-700"
              }
            >
              {status === "Completada" ? "Entregado" : "No estaba"}
            </span>
          </p>
        </div>

        {status === "Completada" ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Ticket
            </p>
            <div className="mt-3 space-y-3">
              <div className="space-y-1 text-sm text-slate-700">
                {(receipt?.items || []).map((it, idx) => (
                  <div
                    key={`${it.name}-${idx}`}
                    className="flex justify-between gap-3"
                  >
                    <span className="truncate">
                      {it.qtyDelivered}x {it.name}
                    </span>
                    <span className="shrink-0 font-semibold text-slate-800">
                      {formatMoney(Number(it.qtyDelivered) * Number(it.priceUnit))}
                    </span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">Total</p>
                  <p className="font-semibold text-slate-900">
                    {formatMoney(receipt?.totalPrice)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-500">Pago</p>
                  <p className="font-semibold text-slate-900">
                    {formatMoney(receipt?.paymentAmount)}{" "}
                    <span className="text-xs font-semibold text-slate-500">
                      ({receipt?.paymentMethod || "-"})
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-xs font-semibold text-slate-500">
                  Nuevo saldo
                </p>
                <p className="font-semibold text-slate-900">
                  {formatMoney(receipt?.newBalanceMoney)}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <a
            href={buildMapsUrl(client)}
            target="_blank"
            rel="noreferrer"
            className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm"
          >
            <MapPin size={18} />
            Maps
          </a>
          {client.phone ? (
            <a
              href={buildWhatsAppUrl(client.phone)}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800 shadow-sm"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
          ) : null}
        </div>
      </div>
    </Sheet>
  );
}
