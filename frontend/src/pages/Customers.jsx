import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { customersApi } from '../utils/api';
import { Plus, Search, Edit2, Trash2, Users } from 'lucide-react';

const EMPTY_FORM = { name: '', email: '', phone: '', address: '' };

export default function Customers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customersApi.list({ search: search || undefined }),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['customers'] });

  const createMut = useMutation({
    mutationFn: customersApi.create,
    onSuccess: () => { toast.success('Customer created'); refetch(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => customersApi.update(id, data),
    onSuccess: () => { toast.success('Customer updated'); refetch(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: customersApi.delete,
    onSuccess: () => { toast.success('Customer deleted'); refetch(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit = (c) => { setSelected(c); setForm({ name: c.name, email: c.email, phone: c.phone || '', address: c.address || '' }); setModal('edit'); };
  const openDelete = (c) => { setSelected(c); setModal('delete'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (modal === 'create') createMut.mutate(form);
    else updateMut.mutate({ id: selected.id, data: form });
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Customers</h2>
        <div className="toolbar">
          <div className="search-input-wrap">
            <Search className="search-icon" />
            <input className="search-input" placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add Customer
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          {isLoading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading customers...</span></div>
          ) : customers.length === 0 ? (
            <div className="empty-state">
              <Users className="icon" size={40} />
              <h3>No customers found</h3>
              <p>{search ? 'Try a different search term' : 'Add your first customer to get started'}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Address</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id}>
                      <td style={{ color: 'var(--text-muted)' }}>{c.id}</td>
                      <td className="primary">{c.name}</td>
                      <td style={{ color: 'var(--accent)' }}>{c.email}</td>
                      <td>{c.phone || '—'}</td>
                      <td style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.address || '—'}</td>
                      <td>{new Date(c.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => openEdit(c)}><Edit2 size={14} /></button>
                          <button className="btn-icon" onClick={() => openDelete(c)} style={{ color: 'var(--red)' }}><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{modal === 'create' ? 'Add Customer' : 'Edit Customer'}</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rahul Sharma" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input className="form-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="rahul@example.com" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address</label>
                    <input className="form-input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="City, State" />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                  {modal === 'create' ? 'Create Customer' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Delete Customer</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">Delete <strong style={{ color: 'var(--text-primary)' }}>{selected.name}</strong>? All their orders will be affected. This cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteMut.mutate(selected.id)} disabled={deleteMut.isPending}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
