import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsApi } from '../utils/api';
import { Plus, Search, Edit2, Trash2, Package, TrendingUp, TrendingDown } from 'lucide-react';

const EMPTY_FORM = { name: '', sku: '', description: '', price: '', stock_quantity: '', low_stock_threshold: '10', category: '' };

export default function Products() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'delete' | 'stock'
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stockAdj, setStockAdj] = useState({ quantity: '', reason: '' });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', search, lowStockOnly],
    queryFn: () => productsApi.list({ search: search || undefined, low_stock: lowStockOnly || undefined }),
  });

  const refetch = () => qc.invalidateQueries({ queryKey: ['products'] });

  const createMut = useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => { toast.success('Product created'); refetch(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => productsApi.update(id, data),
    onSuccess: () => { toast.success('Product updated'); refetch(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => { toast.success('Product deleted'); refetch(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });

  const stockMut = useMutation({
    mutationFn: ({ id, data }) => productsApi.adjustStock(id, data),
    onSuccess: () => { toast.success('Stock adjusted'); refetch(); closeModal(); },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => { setForm(EMPTY_FORM); setModal('create'); };
  const openEdit = (p) => { setSelected(p); setForm({ ...p, price: String(p.price), stock_quantity: String(p.stock_quantity), low_stock_threshold: String(p.low_stock_threshold) }); setModal('edit'); };
  const openDelete = (p) => { setSelected(p); setModal('delete'); };
  const openStock = (p) => { setSelected(p); setStockAdj({ quantity: '', reason: '' }); setModal('stock'); };
  const closeModal = () => { setModal(null); setSelected(null); };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, price: parseFloat(form.price), stock_quantity: parseInt(form.stock_quantity), low_stock_threshold: parseInt(form.low_stock_threshold) };
    if (modal === 'create') createMut.mutate(data);
    else updateMut.mutate({ id: selected.id, data });
  };

  const handleStockSubmit = (e) => {
    e.preventDefault();
    stockMut.mutate({ id: selected.id, data: { quantity: parseInt(stockAdj.quantity), reason: stockAdj.reason } });
  };

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Products</h2>
        <div className="toolbar">
          <div className="search-input-wrap">
            <Search className="search-icon" />
            <input className="search-input" placeholder="Search name, SKU, category..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <button className={`btn btn-ghost btn-sm`} style={lowStockOnly ? { borderColor: 'var(--red)', color: 'var(--red)' } : {}} onClick={() => setLowStockOnly(!lowStockOnly)}>
            Low Stock
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          {isLoading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading products...</span></div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <Package className="icon" size={40} />
              <h3>No products found</h3>
              <p>{search ? 'Try a different search term' : 'Add your first product to get started'}</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const isLow = p.stock_quantity <= p.low_stock_threshold;
                    return (
                      <tr key={p.id}>
                        <td className="primary">{p.name}</td>
                        <td style={{ color: 'var(--accent)', fontFamily: 'DM Mono' }}>{p.sku}</td>
                        <td>{p.category || '—'}</td>
                        <td style={{ color: 'var(--green)' }}>₹{parseFloat(p.price).toFixed(2)}</td>
                        <td>
                          <span style={{ color: p.stock_quantity === 0 ? 'var(--red)' : isLow ? 'var(--yellow)' : 'var(--text-primary)', fontWeight: 500 }}>
                            {p.stock_quantity}
                          </span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}> / {p.low_stock_threshold}</span>
                        </td>
                        <td>
                          <span className={`badge ${isLow ? 'badge-low-stock' : 'badge-in-stock'}`}>
                            {isLow ? 'Low' : 'OK'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button className="btn-icon" title="Adjust Stock" onClick={() => openStock(p)}>
                              {stockAdj.quantity > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            </button>
                            <button className="btn-icon" title="Edit" onClick={() => openEdit(p)}>
                              <Edit2 size={14} />
                            </button>
                            <button className="btn-icon" title="Delete" onClick={() => openDelete(p)} style={{ color: 'var(--red)' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              <span className="modal-title">{modal === 'create' ? 'Add Product' : 'Edit Product'}</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Product Name *</label>
                    <input className="form-input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Wireless Headphones" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">SKU *</label>
                    <input className="form-input" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })} placeholder="e.g. WH-001" />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description..." />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Price (₹) *</label>
                    <input className="form-input" type="number" step="0.01" min="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0.00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <input className="form-input" value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Electronics" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Stock Quantity *</label>
                    <input className="form-input" type="number" min="0" required value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Low Stock Threshold</label>
                    <input className="form-input" type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending || updateMut.isPending}>
                  {modal === 'create' ? 'Create Product' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjust Modal */}
      {modal === 'stock' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Adjust Stock — {selected.name}</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleStockSubmit}>
              <div className="modal-body">
                <p style={{ color: 'var(--text-secondary)', marginBottom: 16, fontSize: 13 }}>
                  Current stock: <strong style={{ color: 'var(--text-primary)' }}>{selected.stock_quantity}</strong>
                </p>
                <div className="form-group">
                  <label className="form-label">Adjustment (+ to add, - to remove)</label>
                  <input className="form-input" type="number" required value={stockAdj.quantity} onChange={(e) => setStockAdj({ ...stockAdj, quantity: e.target.value })} placeholder="e.g. 50 or -10" />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <input className="form-input" value={stockAdj.reason} onChange={(e) => setStockAdj({ ...stockAdj, reason: e.target.value })} placeholder="e.g. Restock, Damaged goods..." />
                </div>
                {stockAdj.quantity && (
                  <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    New stock will be: <strong style={{ color: 'var(--accent)' }}>{selected.stock_quantity + parseInt(stockAdj.quantity || 0)}</strong>
                  </p>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={stockMut.isPending}>Apply Adjustment</button>
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
              <span className="modal-title">Delete Product</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{selected.name}</strong>? This action cannot be undone.</p>
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
