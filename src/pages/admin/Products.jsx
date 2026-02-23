import { useEffect, useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";
import {
  createProduct,
  deleteProduct,
  listenProducts,
  updateProduct,
} from "../../services/products";

const emptyForm = {
  name: "",
  price: "",
  stock: "",
  isInfiniteStock: false,
  isWater: false,
};

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const unsubscribe = listenProducts((items) => {
      setProducts(items);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name ?? "",
      price: product.price ?? "",
      stock: product.stock ?? "",
      isInfiniteStock: Boolean(product.isInfiniteStock),
      isWater: Boolean(product.isWater),
    });
    setOpen(true);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const payload = useMemo(() => {
    const priceValue = Number(form.price);
    const stockValue = Number(form.stock);

    return {
      name: form.name.trim(),
      price: Number.isNaN(priceValue) ? 0 : priceValue,
      stock: form.isInfiniteStock ? 0 : Number.isNaN(stockValue) ? 0 : stockValue,
      isInfiniteStock: form.isInfiniteStock,
      isWater: form.isWater,
      isActive: true,
    };
  }, [form]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!payload.name) {
      setToast("El nombre es obligatorio.");
      return;
    }

    if (!form.isInfiniteStock && form.stock === "") {
      setToast("El stock es obligatorio si no es infinito.");
      return;
    }

    try {
      if (editing) {
        await updateProduct(editing.id, payload);
        setToast("Producto actualizado.");
      } else {
        await createProduct(payload);
        setToast("Producto creado.");
      }
      setOpen(false);
    } catch (error) {
      console.error(error);
      setToast("No se pudo guardar el producto.");
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Eliminar ${product.name}?`)) return;
    try {
      await deleteProduct(product.id);
      setToast("Producto eliminado.");
    } catch (error) {
      console.error(error);
      setToast("No se pudo eliminar.");
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Productos</h2>
          <p className="text-sm text-slate-500">
            Gestioná stock físico e infinito.
          </p>
        </div>
        <Button className="w-auto px-6" onClick={openCreate}>
          Nuevo producto
        </Button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    Cargando productos...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-400" colSpan={4}>
                    Todavía no hay productos.
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-3">
                      ${Number(product.price ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      {product.isInfiniteStock ? "∞" : product.stock ?? 0}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(product)}
                          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product)}
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 transition hover:border-rose-300 hover:text-rose-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open ? (
        <Modal
          title={editing ? "Editar producto" : "Nuevo producto"}
          onClose={() => setOpen(false)}
        >
          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Precio
              <Input
                name="price"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={handleChange}
                required
              />
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="isInfiniteStock"
                checked={form.isInfiniteStock}
                onChange={handleChange}
                className="h-5 w-5 rounded border-slate-300 text-slate-900"
              />
              Stock infinito
            </label>
            <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="isWater"
                checked={form.isWater}
                onChange={handleChange}
                className="h-5 w-5 rounded border-slate-300 text-slate-900"
              />
              Es agua (isWater)
            </label>
            {!form.isInfiniteStock ? (
              <label className="block text-sm font-medium text-slate-700">
                Stock
                <Input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  value={form.stock}
                  onChange={handleChange}
                  required={!form.isInfiniteStock}
                />
              </label>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <Button type="submit" className="sm:w-auto sm:px-6">
                Guardar
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="sm:w-auto sm:px-6"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Modal>
      ) : null}

      <Toast message={toast} onClear={() => setToast("")} />
    </section>
  );
}
