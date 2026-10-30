import { useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { confirmDelivery, skipVisit } from "../../../services/deliveries";
import QtyStepper from "./QtyStepper";
import Sheet from "./Sheet";

export const CRITICAL_DEBT_LIMIT = 20000;

export default function DeliverySheet({
  client,
  driverId,
  products,
  loadingProducts,
  onClose,
  onDone,
  onError,
}) {
  const [qtyById, setQtyById] = useState({});
  const deliveredTotal = useMemo(() => {
    return Object.values(qtyById).reduce((sum, qty) => sum + Number(qty || 0), 0);
  }, [qtyById]);

  // null = "automático": devueltos = entregados, hasta que el repartidor lo edite.
  const [returnedInput, setReturnedInput] = useState(null);
  const returned = returnedInput ?? String(deliveredTotal);
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Efectivo");
  const [saving, setSaving] = useState(false);
  const [debtConfirm, setDebtConfirm] = useState(false);

  const items = useMemo(() => {
    return products
      .filter((p) => Number(qtyById[p.id] || 0) > 0)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        qtyDelivered: Number(qtyById[p.id] || 0),
        priceUnit: Number(p.price ?? 0),
        isInfiniteStock: Boolean(p.isInfiniteStock),
        isWater: Boolean(p.isWater),
      }));
  }, [products, qtyById]);

  const totalPrice = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.qtyDelivered * item.priceUnit,
      0
    );
  }, [items]);

  const prevMoney = Number(client.balanceMoney ?? 0);
  const prevBottles = Number(client.balanceBottles ?? 0);
  const pay = Math.max(0, Number(paymentAmount) || 0);
  const returnedNum = Math.max(0, Math.trunc(Number(returned) || 0));
  const nextMoney = prevMoney + (totalPrice - pay);
  const nextBottles = prevBottles + (deliveredTotal - returnedNum);
  const isCriticalDebt = prevMoney > CRITICAL_DEBT_LIMIT;

  const setQty = (id, qty) => {
    setQtyById((prev) => ({ ...prev, [id]: qty }));
  };

  const handleConfirm = async () => {
    if (!driverId) {
      onError("No hay sesión de repartidor.");
      return;
    }

    if (isCriticalDebt && !debtConfirm) {
      onError("Debes confirmar la deuda alta antes de continuar.");
      return;
    }

    if (items.length === 0) {
      onError("Agregá al menos 1 producto.");
      return;
    }

    setSaving(true);
    try {
      const result = await confirmDelivery({
        clientId: client.id,
        driverId,
        items,
        bottlesReturned: returnedNum,
        paymentAmount: pay,
        paymentMethod,
      });
      onDone(client.id, "Completada", {
        items: result.items.map((item) => ({
          name: item.name,
          qtyDelivered: item.qtyDelivered,
          priceUnit: item.priceUnit,
        })),
        bottlesReturned: result.bottlesReturned,
        totalPrice: result.totalPrice,
        paymentAmount: result.paymentAmount,
        paymentMethod: result.paymentMethod,
        newBalanceMoney: result.newBalanceMoney,
      });
    } catch (error) {
      console.error(error);
      onError(error?.message || "No se pudo confirmar la entrega.");
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    if (!driverId) {
      onError("No hay sesión de repartidor.");
      return;
    }

    if (!window.confirm("Marcar como 'No estaba / Omitir'?")) return;

    setSaving(true);
    try {
      await skipVisit({ clientId: client.id, driverId });
      onDone(client.id, "Fallida", {
        items: [],
        totalPrice: 0,
        paymentAmount: 0,
        paymentMethod: null,
        newBalanceMoney: prevMoney,
      });
    } catch (error) {
      console.error(error);
      onError("No se pudo registrar la visita fallida.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title={client.name} onClose={onClose}>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{client.address}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold">
          <div className="rounded-2xl bg-white px-3 py-2 text-slate-700">
            Deuda actual: ${prevMoney.toFixed(0)}
          </div>
          <div className="rounded-2xl bg-white px-3 py-2 text-slate-700">
            Envases actuales: {prevBottles}
          </div>
        </div>
        {isCriticalDebt ? (
          <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            ⚠ Deuda alta: ${prevMoney.toFixed(0)}
          </div>
        ) : null}
      </div>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Productos</h3>
            <p className="text-xs text-slate-500">Seleccioná cantidades.</p>
          </div>
          <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">
            Total: ${totalPrice.toFixed(0)}
          </div>
        </div>

        {loadingProducts ? (
          <p className="text-sm text-slate-500">Cargando productos...</p>
        ) : products.length === 0 ? (
          <p className="text-sm text-slate-500">No hay productos activos.</p>
        ) : (
          <div className="space-y-3">
            {products.map((product) => {
              const qty = Number(qtyById[product.id] || 0);
              return (
                <div
                  key={product.id}
                  className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {product.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        ${Number(product.price ?? 0).toFixed(0)}{" "}
                        {product.isInfiniteStock
                          ? "(stock ∞)"
                          : `(stock ${product.stock ?? 0})`}
                      </p>
                    </div>
                    <QtyStepper
                      value={qty}
                      onChange={(v) => setQty(product.id, v)}
                      max={
                        product.isInfiniteStock
                          ? null
                          : Number(product.stock ?? 0)
                      }
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Envases</h3>
        <label className="block text-sm font-medium text-slate-700">
          Envases devueltos
          <Input
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={returned}
            onChange={(e) => setReturnedInput(e.target.value)}
          />
        </label>
        <p className="text-xs font-semibold text-slate-500">
          Saldo envases luego: <span className="text-slate-900">{nextBottles}</span>
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900">Pago</h3>
        <Input
          type="number"
          min="0"
          step="1"
          inputMode="numeric"
          value={paymentAmount}
          onChange={(e) => setPaymentAmount(e.target.value)}
          placeholder="Entrega ($)"
        />
        <p className="text-sm font-medium text-slate-700">Abona con</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("Efectivo")}
            className={`min-h-[52px] rounded-2xl border px-4 text-sm font-semibold transition ${
              paymentMethod === "Efectivo"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Efectivo
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("Transferencia")}
            className={`min-h-[52px] rounded-2xl border px-4 text-sm font-semibold transition ${
              paymentMethod === "Transferencia"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700"
            }`}
          >
            Transferencia
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">Total pedido</p>
          <p className="text-sm font-semibold text-slate-900">
            ${totalPrice.toFixed(0)}
          </p>
          <div className="mt-2 rounded-xl bg-white px-3 py-2 text-center">
            <p className="text-xs font-semibold text-slate-500">Saldo final</p>
            <p
              className={`text-xl font-semibold ${
                nextMoney > 0 ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              ${nextMoney.toFixed(0)}
            </p>
          </div>
        </div>
      </section>

      <div className="space-y-3">
        {isCriticalDebt ? (
          <label className="flex items-start gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={debtConfirm}
              onChange={(e) => setDebtConfirm(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-slate-300 text-slate-900"
            />
            Confirmo que el cliente tiene deuda alta y autorizo la entrega.
          </label>
        ) : null}
        <Button onClick={handleConfirm} disabled={saving}>
          {saving ? "Procesando..." : "Confirmar entrega"}
        </Button>
        <div className="h-2" />
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="flex min-h-[52px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-base font-semibold text-slate-600 shadow-sm"
        >
          No estaba / Omitir
        </button>
      </div>
    </Sheet>
  );
}
