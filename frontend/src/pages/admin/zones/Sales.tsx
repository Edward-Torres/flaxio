import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { Sale, Product, Customer } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';
import { Button, Field, Input } from '../../../components/ui';

export default function Sales() {
  const [items, setItems] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Sale> | null>(null);
  const [saving, setSaving] = useState(false);

  const empty = {
    customerName: '',
    paymentMethod: 'Efectivo',
    status: 'COMPLETED',
    date: new Date().toISOString().split('T')[0],
    items: [] as { productId: string; quantity: number; price: number }[],
  };

  useEffect(() => {
    Promise.all([
      api.get<Sale[]>('/admin/sales'),
      api.get<Product[]>('/admin/products'),
      api.get<Customer[]>('/admin/customers'),
    ])
      .then(([sales, prods, custs]) => {
        setItems(sales);
        setProducts(prods);
        setCustomers(custs);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function addItem() {
    if (!editing) return;
    setEditing({
      ...editing,
      items: [...(editing.items || []), { productId: '', quantity: 1, price: 0 }],
    } as any);
  }

  function updateItem(index: number, field: string, value: string | number) {
    if (!editing) return;
    const newItems = [...(editing.items || [])];
    newItems[index] = { ...newItems[index], [field]: value } as any;
    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      if (product) {
        newItems[index] = { ...newItems[index], price: product.price } as any;
      }
    }
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
        paymentMethod: editing.paymentMethod,
        status: editing.status,
        items: editing.items || [],
      };
      if (editing.customerName) payload.customerName = editing.customerName;
      if (editing.id) {
        await api.put(`/admin/sales/${editing.id}`, payload);
      } else {
        await api.post('/admin/sales', payload);
      }
      setEditing(null);
      api.get<Sale[]>('/admin/sales').then(setItems).catch(console.error);
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
    if (!confirm('¿Eliminar esta venta?')) return;
    try {
      await api.del(`/admin/sales/${id}`);
      setItems(items.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  const total = editing?.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Ventas</h1>
          <p className="text-sm text-ink-soft">Registro y seguimiento de ventas</p>
        </div>
        <Button onClick={() => setEditing({ ...empty } as any)}>+ Nueva venta</Button>
      </div>
      <div className="card">
        {loading ? (
          <p className="text-ink-soft py-6 text-center">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-ink-soft py-6 text-center">No hay ventas registradas</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Medio</th>
                <th className="text-right p-3">Total</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-line/50">
                  <td className="p-3">{new Date(s.date).toLocaleDateString('es-AR')}</td>
                  <td className="p-3">{s.customerName || 'Consumidor final'}</td>
                  <td className="p-3">{s.paymentMethod}</td>
                  <td className="p-3 text-right">${s.total.toFixed(2)}</td>
                  <td className="p-3">
                    <span className={'badge ' + (s.status === 'COMPLETED' ? 'green' : 'yellow')}>{s.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setEditing(s as any)} className="!px-2 !py-1">Editar</Button>
                      <Button variant="ghost" onClick={() => handleDelete(s.id)} className="!px-2 !py-1 text-danger">Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={!!editing} title={editing?.id ? 'Editar venta' : 'Nueva venta'} onClose={() => setEditing(null)} wide>
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
              <Field label="Cliente">
                <select
                  value={editing.customerName || ''}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, customerName: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-white"
                >
                  <option value="">Consumidor final</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Medio de pago">
                <select
                  value={editing.paymentMethod}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, paymentMethod: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-white"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </Field>
              <Field label="Estado">
                <select
                  value={editing.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, status: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-white"
                >
                  <option value="COMPLETED">Completada</option>
                  <option value="PENDING">Pendiente</option>
                </select>
              </Field>
            </div>
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
                          placeholder="Precio"
                          value={item.price}
                          onChange={(e) => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
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
