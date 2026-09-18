import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { CashMovement } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';
import { Button, Field, Input } from '../../../components/ui';

export default function Cash() {
  const [items, setItems] = useState<CashMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<CashMovement> | null>(null);
  const [saving, setSaving] = useState(false);

  const empty = {
    type: 'INCOME',
    amount: 0,
    method: 'Efectivo',
    description: '',
    date: new Date().toISOString().split('T')[0],
  };

  useEffect(() => {
    api.get<CashMovement[]>('/admin/cash')
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        date: editing.date,
        type: editing.type,
        amount: editing.amount,
        method: editing.method,
      };
      if (editing.description) payload.description = editing.description;
      if (editing.id) {
        await api.put(`/admin/cash/${editing.id}`, payload);
      } else {
        await api.post('/admin/cash', payload);
      }
      setEditing(null);
      api.get<CashMovement[]>('/admin/cash').then(setItems).catch(console.error);
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return;
    try {
      await api.del(`/admin/cash/${id}`);
      setItems(items.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Caja</h1>
          <p className="text-sm text-ink-soft">Movimientos de caja y medios de pago</p>
        </div>
        <Button onClick={() => setEditing({ ...empty } as any)}>+ Nuevo movimiento</Button>
      </div>
      <div className="card">
        {loading ? (
          <p className="text-ink-soft py-6 text-center">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-ink-soft py-6 text-center">No hay movimientos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Medio</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-right p-3">Importe</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b border-line/50">
                  <td className="p-3">{new Date(m.date).toLocaleDateString('es-AR')}</td>
                  <td className="p-3">
                    <span className={'badge ' + (m.type === 'INCOME' ? 'green' : 'red')}>
                      {m.type === 'INCOME' ? 'INGRESO' : 'EGRESO'}
                    </span>
                  </td>
                  <td className="p-3">{m.method}</td>
                  <td className="p-3">{m.description || '-'}</td>
                  <td className="p-3 text-right">
                    <span className={m.type === 'INCOME' ? 'text-success' : 'text-danger'}>
                      {m.type === 'INCOME' ? '+' : '-'}${m.amount.toFixed(2)}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setEditing(m as any)} className="!px-2 !py-1">Editar</Button>
                      <Button variant="ghost" onClick={() => handleDelete(m.id)} className="!px-2 !py-1 text-danger">Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={!!editing} title={editing?.id ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={() => setEditing(null)}>
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
              <Field label="Tipo">
                <select
                  value={editing.type}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, type: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-white"
                >
                  <option value="INCOME">Ingreso</option>
                  <option value="EXPENSE">Egreso</option>
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Importe">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.amount ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, amount: parseFloat(e.target.value) } as any)}
                  required
                />
              </Field>
              <Field label="Medio">
                <select
                  value={editing.method}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditing({ ...editing, method: e.target.value } as any)}
                  className="w-full px-3 py-2 border border-line rounded-lg bg-white"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Banco">Banco</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                  <option value="Tarjeta">Tarjeta</option>
                </select>
              </Field>
            </div>
            <Field label="Descripción">
              <Input
                value={editing.description ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, description: e.target.value } as any)}
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
