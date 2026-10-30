import { MapPin, MessageCircle } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  buildMapsUrl,
  formatMoney,
  WATER_STATUS_DOT,
  waterStatus,
} from "../../../lib/clients";

export default function ClientCard({
  client,
  onOpen,
  onWhatsApp,
  handle = null,
  containerRef,
  style,
  dimmed = false,
}) {
  return (
    <div
      ref={containerRef}
      style={style}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpen();
      }}
      className={`cursor-pointer rounded-2xl border border-slate-200 bg-white p-3 shadow-md shadow-slate-200/60 transition active:scale-[0.99] ${
        dimmed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            {handle}
            <p className="truncate text-base font-semibold text-slate-900">
              {client.name}
            </p>
          </div>
          <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-600">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                WATER_STATUS_DOT[waterStatus(client)]
              }`}
              title="Estado de agua"
            />
            <span className="truncate">{client.address}</span>
          </p>
          <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-600">
            <span>Deuda: {formatMoney(client.balanceMoney)}</span>
            <span className="text-slate-500">
              Envases: {Number(client.balanceBottles ?? 0)}
            </span>
            <span className="text-slate-500">
              🚰 {Number(client.dispenserCount ?? 0)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <a
            href={buildMapsUrl(client)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            title="Abrir Maps"
          >
            <MapPin size={20} className="text-slate-600" />
          </a>
          {client.phone ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onWhatsApp?.(client);
              }}
              className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm"
              title="WhatsApp"
            >
              <MessageCircle size={20} />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SortableClientCard({ client, index, onOpen, onWhatsApp }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  return (
    <ClientCard
      client={client}
      onOpen={onOpen}
      onWhatsApp={onWhatsApp}
      containerRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dimmed={isDragging}
      handle={
        <button
          ref={setActivatorNodeRef}
          type="button"
          title="Mantener y arrastrar para reordenar"
          onClick={(e) => e.stopPropagation()}
          className="flex h-8 w-8 select-none items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white shadow-sm touch-none"
          {...attributes}
          {...listeners}
        >
          {index + 1}
        </button>
      }
    />
  );
}
