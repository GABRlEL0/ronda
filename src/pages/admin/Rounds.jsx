import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Button from "../../components/ui/Button";
import Toast from "../../components/ui/Toast";
import {
  listenClientsByDay,
  saveRouteOrderBatch,
} from "../../services/routes";

const DAYS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

function SortableRow({ client, index }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: client.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition ${
        isDragging ? "opacity-60" : ""
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="flex h-9 w-9 select-none items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white touch-none"
        title="Mantener y arrastrar para reordenar"
        {...attributes}
        {...listeners}
      >
        {index + 1}
      </button>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-900">{client.name}</p>
        <p className="text-xs text-slate-500">{client.address}</p>
      </div>
      <div className="text-xs font-semibold text-slate-400">
        #{client.routeOrder ?? index}
      </div>
    </div>
  );
}

export default function AdminRounds() {
  const [day, setDay] = useState(DAYS[0]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    // Helps Chrome mobile emulation / real touch by using touch events directly.
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenClientsByDay(day, (items) => {
      setClients(items);
      setLoading(false);
      setIsDirty(false);
    });
    return () => unsubscribe();
  }, [day]);

  const ids = useMemo(() => clients.map((client) => client.id), [clients]);

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(active.id);
    const newIndex = ids.indexOf(over.id);
    setClients((items) => arrayMove(items, oldIndex, newIndex));
    setIsDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveRouteOrderBatch(clients);
      setToast("Orden guardado.");
      setIsDirty(false);
    } catch (error) {
      console.error(error);
      setToast("No se pudo guardar el orden.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Gestión de rondas
          </h2>
          <p className="text-sm text-slate-500">
            Ordená los clientes del día antes de salir a ruta.
          </p>
        </div>
        <Button
          className="w-auto px-6"
          onClick={handleSave}
          disabled={!isDirty || saving}
        >
          {saving ? "Guardando..." : "Guardar orden"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {DAYS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setDay(item)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              day === item
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-slate-100/50 p-4 shadow-sm">
        {loading ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            Cargando clientes...
          </p>
        ) : clients.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">
            No hay clientes cargados para {day}.
          </p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {clients.map((client, index) => (
                  <SortableRow
                    key={client.id}
                    client={client}
                    index={index}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Toast message={toast} onClear={() => setToast("")} />
    </section>
  );
}
