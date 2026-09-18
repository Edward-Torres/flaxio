import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { Product, Category } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';
import { Button, Field, Input } from '../../../components/ui';

type ProductForm = {
  name: string;
  price: number;
  stock: number;
  unit: string;
  category: string;
  cost?: number;
  minStock?: number;
  id?: string;
};

export default function Products() {
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ProductForm | null>(null);
  const [saving, setSaving] = useState(false);

  const empty: ProductForm = { name: '', price: 0, stock: 0, unit: 'un', category: '' };

  useEffect(() => {
    Promise.all([
      api.get<Product[]>('/admin/products'),
      api.get<Category[]>('/admin/categories'),
    ])
      .then(([prods, cats]) => {
        setItems(prods);
        setCategories(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));

    function onCategoriesUpdated() {
      api.get<Category[]>('/admin/categories').then(setCategories).catch(console.error);
    }
    window.addEventListener('categories-updated', onCategoriesUpdated);
    return () => window.removeEventListener('categories-updated', onCategoriesUpdated);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: editing.name,
        price: editing.price,
        stock: editing.stock,
        category: editing.category || '',
      };
      if (editing.cost != null) payload.cost = editing.cost;
      if (editing.minStock != null) payload.minStock = editing.minStock;
      if (editing.unit) payload.unit = editing.unit;
      if (editing.id) {
        await api.put(`/admin/products/${editing.id}`, payload);
      } else {
        await api.post('/admin/products', payload);
      }
      setEditing(null);
      api.get<Product[]>('/admin/products').then(setItems).catch(console.error);
    } catch (err: any) {
      const details = err?.details;
      let msg = err?.message || 'Error al guardar';
      if (Array.isArray(details)) {
        msg += ': ' + details.map((d: any) => d.path && d.message ? `${d.path}: ${d.message}` : (d.message || '')).join(', ');
      }
      alert(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await api.del(`/admin/products/${id}`);
      setItems(items.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  function startEdit(product: Product) {
    setEditing({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      unit: product.unit || 'un',
      category: product.category?.name || '',
      cost: product.cost,
      minStock: product.minStock,
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Productos</h1>
          <p className="text-sm text-ink-soft">Gestión de inventario</p>
        </div>
        <Button onClick={() => setEditing({ ...empty })}>+ Nuevo</Button>
      </div>
      <div className="card">
        {loading ? (
          <p className="text-ink-soft py-6 text-center">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-ink-soft py-6 text-center">No hay productos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Categoría</th>
                <th className="text-right p-3">Precio</th>
                <th className="text-right p-3">Stock</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-line/50">
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category?.name || '-'}</td>
                  <td className="p-3 text-right">${p.price.toFixed(2)}</td>
                  <td className="p-3 text-right">{p.stock}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => startEdit(p)} className="!px-2 !py-1">
                        Editar
                      </Button>
                      <Button variant="ghost" onClick={() => handleDelete(p.id)} className="!px-2 !py-1 text-danger">
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal
        open={!!editing}
        title={editing?.id ? 'Editar producto' : 'Nuevo producto'}
        onClose={() => setEditing(null)}
      >
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nombre">
              <Input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Categoría">
              <select
                value={editing.category}
                onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                className="w-full px-3 py-2 border border-line rounded-lg bg-white"
              >
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Precio">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.price ?? ''}
                  onChange={(e) => setEditing({ ...editing, price: parseFloat(e.target.value) || 0 })}
                  required
                />
              </Field>
              <Field label="Stock">
                <Input
                  type="number"
                  value={editing.stock ?? ''}
                  onChange={(e) => setEditing({ ...editing, stock: parseInt(e.target.value) || 0 })}
                  required
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Costo (opcional)">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.cost ?? ''}
                  onChange={(e) => setEditing({ ...editing, cost: e.target.value ? parseFloat(e.target.value) : undefined })}
                />
              </Field>
              <Field label="Stock mínimo (opcional)">
                <Input
                  type="number"
                  value={editing.minStock ?? ''}
                  onChange={(e) => setEditing({ ...editing, minStock: e.target.value ? parseInt(e.target.value) : undefined })}
                />
              </Field>
            </div>
            <Field label="Unidad">
              <Input
                value={editing.unit}
                onChange={(e) => setEditing({ ...editing, unit: e.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button type="submit" loading={saving}>Guardar</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
