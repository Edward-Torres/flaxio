import { useState, useEffect } from 'react';
import { api } from '../../../lib/api';
import type { Supplier } from '../../../lib/types';
import Modal from '../../../components/admin/Modal';
import { Button, Field, Input } from '../../../components/ui';

export default function Suppliers() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Supplier> | null>(null);
  const [saving, setSaving] = useState(false);

  const empty = { name: '', email: '', phone: '', address: '' };

  useEffect(() => {
    api.get<Supplier[]>('/admin/suppliers')
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
        name: editing.name,
      };
      if (editing.email) payload.email = editing.email;
      if (editing.phone) payload.phone = editing.phone;
      if (editing.address) payload.address = editing.address;
      if (editing.id) {
        await api.put(`/admin/suppliers/${editing.id}`, payload);
      } else {
        await api.post('/admin/suppliers', payload);
      }
      setEditing(null);
      api.get<Supplier[]>('/admin/suppliers').then(setItems).catch(console.error);
    } catch (err: any) {
      alert('Error al guardar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este proveedor?')) return;
    try {
      await api.del(`/admin/suppliers/${id}`);
      setItems(items.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-navy">Proveedores</h1>
          <p className="text-sm text-ink-soft">Gestión de proveedores y compras</p>
        </div>
        <Button onClick={() => setEditing({ ...empty } as any)}>+ Nuevo proveedor</Button>
      </div>
      <div className="card">
        {loading ? (
          <p className="text-ink-soft py-6 text-center">Cargando...</p>
        ) : items.length === 0 ? (
          <p className="text-ink-soft py-6 text-center">No hay proveedores registrados</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="text-left p-3">Nombre</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Teléfono</th>
                <th className="text-right p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-b border-line/50">
                  <td className="p-3">{s.name}</td>
                  <td className="p-3">{s.email || '-'}</td>
                  <td className="p-3">{s.phone || '-'}</td>
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
      <Modal open={!!editing} title={editing?.id ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={() => setEditing(null)}>
        {editing && (
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Nombre">
              <Input
                value={editing.name ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, name: e.target.value } as any)}
                required
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={editing.email ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, email: e.target.value } as any)}
              />
            </Field>
            <Field label="Teléfono">
              <Input
                value={editing.phone ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, phone: e.target.value } as any)}
              />
            </Field>
            <Field label="Dirección">
              <Input
                value={editing.address ?? ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditing({ ...editing, address: e.target.value } as any)}
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
