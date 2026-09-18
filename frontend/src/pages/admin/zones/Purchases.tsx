import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { Purchase, Product, Supplier } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';
import { Button, Field, Input } from '../../../components/ui';

export default function Purchases() {
  const [items, setItems] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Purchase> | null>(null);
  const [saving, setSaving] = useState(false);

  const empty = {
    supplier: '',
    status: 'PENDING',
    date: new Date().toISOString().split('T')[0],
    items: [] as { productId: string; quantity: number; cost: number }[],
  };

  useEffect(() => {
    Promise.all([
      api.get<Purchase[]>('/admin/purchases'),
      api.get<Product[]>('/admin/products'),
      api.get<Supplier[]>('/admin/suppliers'),
    ])
      .then(([purchases, prods, sups]) => {
        setItems(purchases);
        setProducts(prods);
        setSuppliers(sups);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function addItem() {
    if (!editing) return;
    setEditing({
      ...editing,
      items: [...(editing.items || []), { productId: '', quantity: 1, cost: 0 }],
    } as any);
  }

  function updateItem(index: number, field: string, value: string | number) {
    if (!editing) return;
    const newItems = [...(editing.items || [])];
    newItems[index] = { ...newItems[index], [field]: value } as any;
    setEditing({ ...editing, items: newItems } as any);
  }

  function removeItem(index: number) {
    if (!editing) return;
    const newItems = (editing.items || []).filter((_: any, i: number) => i !== index);
    setEditing({ ...editing, items: newItems } as any);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        date: editing.date,
        supplier: editing.supplier,
        status: editing.status,
        items: editing.items || [],
      };
      if (editing.id) {
        await api.put(`/admin/purchases/${editing.id}`, payload);
      } else {
        await api.post('/admin/purchases', payload);
      }
      setEditing(null);
      api.get<Purchase[]>('/admin/purchases').then(setItems).catch(console.error);
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
    if (!confirm('¿Eliminar esta compra?')) return;
    try {
      await api.del(`/admin/purchases/${id}`);
      setItems(items.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const total = editing?.items?.reduce((sum: number, item: any) => sum + item.cost * item.quantity, 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Compras</h1>
          <p className="text-sm text-ink-soft">Registro de compras a proveedores</p>
        </div>
        <Button onClick={() => setEditing({ ...empty } as any)}>+ Nueva compra</Button>
      </div>
      <div className="card">
        {loading ? (
          <p className="text-ink-soft py-6 text-center">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-ink-soft py-6 text-center">No hay compras registradas</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Proveedor</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-line/50">
                  <td className="p-3">{new Date(p.date).toLocaleDateString('es-AR')}</td>
                  <td className="p-3">{p.supplier}</td>
                  <td className="p-3 text-right">${p.total.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={'badge ' + (p.status === 'PENDING' ? 'yellow' : 'green')}>{p.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setEditing(p as any)} className="!px-2 !py-1">Editar</Button>
                      <Button variant="ghost" onClick={() => handleDelete(p.id)} className="!px-2 !py-1 text-danger">Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={!!editing} title={editing?.id ? 'Editar compra' : 'Nueva compra'} onClose={() => setEditing(null)} wide>
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fecha">
                <Input
                  type="date"
                  value={editing.date ? new Date(editing.date).toISOString().split('T')[0] : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, date: e.target.value } as any)}
                  required
                />
              </Field>
              <Field label="Proveedor">
                <select
                  value={editing.supplier}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, supplier: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-white"
                  required
                >
                  <option value="">Seleccionar...</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Estado">
              <select
                value={editing.status}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, status: e.target.value } as any)}
                className="w-full px-3 py-2 border border-line rounded-lg bg-white"
              >
                <option value="PENDING">Pendiente</option>
                <option value="COMPLETED">Completada</option>
              </select>
            </Field>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-ink">Productos</label>
                <Button type="button" variant="ghost" onClick={addItem} className="!px-2 !py-1">+ Agregar</Button>
              </div>
              {editing.items && editing.items.length > 0 ? (
                <div className="space-y-2">
                  {(editing.items as any[]).map((item: any, idx: number) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                          className="w-full px-3 py-2 border border-line rounded-lg bg-white"
                          required
                        >
                          <option value="">Seleccionar...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          placeholder="Cant."
                          value={item.quantity}
                          onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Costo"
                          value={item.cost}
                          onChange={(e) => updateItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <Button type="button" variant="ghost" onClick={() => removeItem(idx)} className="!px-2 !py-1 text-danger">✕</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-ink-soft">Agregá al menos un producto</p>
              )}
            </div>
            {editing.items && editing.items.length > 0 && (
              <div className="text-right font-semibold text-navy">
                Total: ${total.toFixed(2)}
              </div>
            )}
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
