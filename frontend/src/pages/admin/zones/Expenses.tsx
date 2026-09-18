import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { Expense } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';
import { Button, Field, Input } from '../../../components/ui';

export default function Expenses() {
  const [items, setItems] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Expense> | null>(null);
  const [saving, setSaving] = useState(false);

  const empty = {
    category: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
  };

  useEffect(() => {
    api.get<Expense[]>('/admin/expenses')
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
        amount: editing.amount,
        category: editing.category,
      };
      if (editing.description) payload.description = editing.description;
      if (editing.id) {
        await api.put(`/admin/expenses/${editing.id}`, payload);
      } else {
        await api.post('/admin/expenses', payload);
      }
      setEditing(null);
      api.get<Expense[]>('/admin/expenses').then(setItems).catch(console.error);
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
    if (!confirm('¿Eliminar este gasto?')) return;
    try {
      await api.del(`/admin/expenses/${id}`);
      setItems(items.filter((e) => e.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Gastos</h1>
          <p className="text-sm text-ink-soft">Registro y control de gastos</p>
        </div>
        <Button onClick={() => setEditing({ ...empty } as any)}>+ Nuevo gasto</Button>
      </div>
      <div className="card">
        {loading ? (
          <p className="text-ink-soft py-6 text-center">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-ink-soft py-6 text-center">No hay gastos registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Categoría</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-right p-3">Importe</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-line/50">
                  <td className="p-3">{new Date(e.date).toLocaleDateString('es-AR')}</td>
                  <td className="p-3">{e.category}</td>
                  <td className="p-3">{e.description || '-'}</td>
                  <td className="p-3 text-right">${e.amount.toFixed(2)}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setEditing(e as any)} className="!px-2 !py-1">Editar</Button>
                      <Button variant="ghost" onClick={() => handleDelete(e.id)} className="!px-2 !py-1 text-danger">Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={!!editing} title={editing?.id ? 'Editar gasto' : 'Nuevo gasto'} onClose={() => setEditing(null)}>
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
              <Field label="Importe">
                <Input
                  type="number"
                  step="0.01"
                  value={editing.amount ?? ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, amount: parseFloat(e.target.value) } as any)}
                  required
                />
              </Field>
            </div>
            <Field label="Categoría">
              <Input
                value={editing.category ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, category: e.target.value } as any)}
                required
              />
            </Field>
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
