import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ordersApi, customersApi, productsApi } from '../utils/api';
import { Plus, Search, Trash2, ShoppingCart, Eye, X } from 'lucide-react';

const STATUS_OPTIONS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];

export default function Orders() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [orderForm, setOrderForm] = useState({ customer_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', statusFilter],
    queryFn: () => ordersApi.list({ status: statusFilter || undefined }),
  });

  const { data: customers = [] } = useQuery({ queryKey: ['customers'], queryFn: () => customersApi.list({}) });
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list({}) });

  const refetch = () => qc.invalidateQueries({ queryKey: ['orders'] });

  const createMut = useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      toast.success('Order created!');
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      closeModal();
    },
    onError: (e) => toast.error(e.message),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }) => ordersApi.updateStatus(id, status),
    onSuccess: () => { toast.success('Status updated'); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: ordersApi.delete,
    onSuccess: () => {
      toast.success('Order deleted');
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['products'] });
      closeModal();
    },
    onError: (e) => toast.error(e.message),
  });

  const closeModal = () => { setModal(null); setSelected(null); };

  const openCreate = () => {
    setOrderForm({ customer_id: '', notes: '', items: [{ product_id: '', quantity: 1 }] });
    setModal('create');
  };

  const addItem = () => setOrderForm(f => ({ ...f, items: [...f.items, { product_id: '', quantity: 1 }] }));
  const removeItem = (i) => setOrderForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i, field, value) => setOrderForm(f => {
    const items = [...f.items];
    items[i] = { ...items[i], [field]: value };
    return { ...f, items };
  });

  const calcTotal = () => {
    return orderForm.items.reduce((sum, item) => {
      const prod = products.find(p => String(p.id) === String(item.product_id));
      if (!prod || !item.quantity) return sum;
      return sum + parseFloat(prod.price) * parseInt(item.quantity || 0);
    }, 0);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const items = orderForm.items.filter(i => i.product_id && i.quantity > 0);
    if (items.length === 0) return toast.error('Add at least one item');
    createMut.mutate({
      customer_id: parseInt(orderForm.customer_id),
      notes: orderForm.notes || undefined,
      items: items.map(i => ({ product_id: parseInt(i.product_id), quantity: parseInt(i.quantity) })),
    });
  };

  const filteredOrders = orders.filter(o => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      String(o.id).includes(s) ||
      o.customer?.name?.toLowerCase().includes(s) ||
      o.customer?.email?.toLowerCase().includes(s)
    );
  });

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Orders</h2>
        <div className="toolbar">
          <div className="search-input-wrap">
            <Search className="search-icon" />
            <input className="search-input" placeholder="Search order #, customer..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="form-select" style={{ width: 'auto', padding: '8px 12px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={14} /> New Order
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="card">
          {isLoading ? (
            <div className="loading-state"><div className="spinner" /><span>Loading orders...</span></div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state">
              <ShoppingCart className="icon" size={40} />
              <h3>No orders found</h3>
              <p>Create your first order to get started</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr key={o.id}>
                      <td className="primary">#{String(o.id).padStart(4, '0')}</td>
                      <td>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{o.customer?.name || `#${o.customer_id}`}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.customer?.email}</div>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''}</td>
                      <td style={{ color: 'var(--green)', fontWeight: 500 }}>₹{parseFloat(o.total_amount).toFixed(2)}</td>
                      <td>
                        <select
                          className="status-select"
                          value={o.status}
                          onChange={(e) => statusMut.mutate({ id: o.id, status: e.target.value })}
                        >
                          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                      </td>
                      <td>{new Date(o.created_at).toLocaleDateString()}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button className="btn-icon" onClick={() => { setSelected(o); setModal('view'); }}><Eye size={14} /></button>
                          <button className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => { setSelected(o); setModal('delete'); }}><Trash2 size={14} /></button>
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

      {/* Create Order Modal */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Create New Order</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Customer *</label>
                  <select className="form-select" required value={orderForm.customer_id} onChange={(e) => setOrderForm({ ...orderForm, customer_id: e.target.value })}>
                    <option value="">— Select customer —</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Order Items *</label>
                  {orderForm.items.map((item, i) => {
                    const prod = products.find(p => String(p.id) === String(item.product_id));
                    return (
                      <div key={i} className="order-item-row" style={{ marginBottom: 8 }}>
                        <select className="form-select" value={item.product_id} onChange={(e) => updateItem(i, 'product_id', e.target.value)}>
                          <option value="">— Select product —</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} (SKU: {p.sku}) — Stock: {p.stock_quantity}
                            </option>
                          ))}
                        </select>
                        <input
                          className="form-input"
                          type="number"
                          min="1"
                          max={prod?.stock_quantity || 9999}
                          style={{ width: 80 }}
                          value={item.quantity}
                          onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        />
                        {orderForm.items.length > 1 && (
                          <button type="button" className="btn-icon" style={{ color: 'var(--red)' }} onClick={() => removeItem(i)}>
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 4 }} onClick={addItem}>
                    <Plus size={12} /> Add Item
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} placeholder="Optional notes..." />
                </div>

                {orderForm.items.some(i => i.product_id) && (
                  <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '12px 16px', border: '1px solid var(--border)' }}>
                    {orderForm.items.filter(i => i.product_id).map((item, i) => {
                      const prod = products.find(p => String(p.id) === String(item.product_id));
                      if (!prod) return null;
                      return (
                        <div key={i} className="summary-item">
                          <span>{prod.name} × {item.quantity}</span>
                          <span>₹{(parseFloat(prod.price) * (parseInt(item.quantity) || 0)).toFixed(2)}</span>
                        </div>
                      );
                    })}
                    <div className="summary-item">
                      <span>Total</span>
                      <span style={{ color: 'var(--green)' }}>₹{calcTotal().toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={createMut.isPending}>Place Order</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Order Modal */}
      {modal === 'view' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Order #{String(selected.id).padStart(4, '0')}</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Customer</div>
                  <div style={{ color: 'var(--text-primary)' }}>{selected.customer?.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>{selected.customer?.email}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Status</div>
                  <span className={`badge badge-${selected.status}`}>{selected.status}</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Date</div>
                  <div style={{ color: 'var(--text-secondary)' }}>{new Date(selected.created_at).toLocaleString()}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Total</div>
                  <div style={{ color: 'var(--green)', fontWeight: 500, fontSize: 16 }}>₹{parseFloat(selected.total_amount).toFixed(2)}</div>
                </div>
              </div>
              {selected.notes && (
                <div style={{ background: 'var(--bg-elevated)', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {selected.notes}
                </div>
              )}
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Items</div>
              {selected.items?.map((item) => (
                <div key={item.id} className="summary-item">
                  <span>{item.product?.name || `Product #${item.product_id}`} × {item.quantity}</span>
                  <span>₹{(parseFloat(item.unit_price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="summary-item" style={{ marginTop: 4 }}>
                <strong>Total</strong>
                <strong style={{ color: 'var(--green)' }}>₹{parseFloat(selected.total_amount).toFixed(2)}</strong>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal === 'delete' && selected && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Delete Order</span>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <p className="confirm-text">Delete order <strong style={{ color: 'var(--text-primary)' }}>#{String(selected.id).padStart(4, '0')}</strong>? Stock will be restored automatically. This cannot be undone.</p>
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
