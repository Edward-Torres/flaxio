import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { Category } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';
import { Button, Field, Input } from '../../../components/ui';

export default function Categories() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  const empty = { name: '' };

  useEffect(() => {
    api.get<Category[]>('/admin/categories')
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await api.put(`/admin/categories/${editing.id}`, editing);
      } else {
        await api.post('/admin/categories', editing);
      }
      setEditing(null);
      api.get<Category[]>('/admin/categories').then(setItems).catch(console.error);
      window.dispatchEvent(new Event('categories-updated'));
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await api.del(`/admin/categories/${id}`);
      setItems(items.filter((c) => c.id !== id));
      window.dispatchEvent(new Event('categories-updated'));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Categorías</h1>
          <p className="text-sm text-ink-soft">Gestión de categorías de productos</p>
        </div>
        <Button onClick={() => setEditing({ ...empty } as any)}>+ Nueva categoría</Button>
      </div>
      <div className="card">
        {loading ? (
          <p className="text-ink-soft py-6 text-center">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-ink-soft py-6 text-center">No hay categorías registradas</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-3">Nombre</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-line/50">
                  <td className="p-3">{c.name}</td>
                  <td className="p-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" onClick={() => setEditing(c as any)} className="!px-2 !py-1">Editar</Button>
                      <Button variant="ghost" onClick={() => handleDelete(c.id)} className="!px-2 !py-1 text-danger">Eliminar</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Modal open={!!editing} title={editing?.id ? 'Editar categoría' : 'Nueva categoría'} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nombre">
              <Input
                value={editing.name ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, name: e.target.value } as any)}
                required
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
