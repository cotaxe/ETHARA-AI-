import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../utils/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Package, Users, ShoppingCart, DollarSign, AlertTriangle, Clock } from 'lucide-react';

const STATUS_COLORS = {
  pending: '#fbbf24',
  confirmed: '#60a5fa',
  shipped: '#7c6af7',
  delivered: '#4ade80',
  cancelled: '#f87171',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid #2a2a42', borderRadius: 8, padding: '10px 14px' }}>
      <p style={{ color: '#8892a4', fontSize: 12, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.fill || '#7c6af7', fontSize: 13 }}>
          {typeof p.value === 'number' && p.name === 'revenue' ? `₹${p.value.toFixed(2)}` : p.value}
        </p>
      ))}
    </div>
  );
};

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.stats,
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="loading-state">
      <div className="spinner" />
      <span>Loading dashboard...</span>
    </div>
  );

  const statusBreakdown = stats?.order_status_breakdown || {};
  const pieData = Object.entries(statusBreakdown).map(([name, value]) => ({ name, value }));

  return (
    <>
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>
      <div className="page-body">
        <div className="stat-grid">
          <div className="stat-card blue">
            <div className="stat-label">Products</div>
            <div className="stat-value">{stats?.total_products ?? 0}</div>
            <Package className="stat-icon" size={40} />
          </div>
          <div className="stat-card">
            <div className="stat-label">Customers</div>
            <div className="stat-value">{stats?.total_customers ?? 0}</div>
            <Users className="stat-icon" size={40} />
          </div>
          <div className="stat-card green">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{stats?.total_orders ?? 0}</div>
            <ShoppingCart className="stat-icon" size={40} />
          </div>
          <div className="stat-card green">
            <div className="stat-label">Revenue</div>
            <div className="stat-value" style={{ fontSize: 20 }}>
              ₹{(stats?.total_revenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </div>
            <DollarSign className="stat-icon" size={40} />
          </div>
          <div className="stat-card red">
            <div className="stat-label">Low Stock</div>
            <div className="stat-value">{stats?.low_stock_count ?? 0}</div>
            <AlertTriangle className="stat-icon" size={40} />
          </div>
          <div className="stat-card yellow">
            <div className="stat-label">Pending Orders</div>
            <div className="stat-value">{stats?.pending_orders ?? 0}</div>
            <Clock className="stat-icon" size={40} />
          </div>
        </div>

        <div className="charts-grid" style={{ marginBottom: 24 }}>
          <div className="card">
            <div className="card-header">Order Status Breakdown</div>
            <div className="card-body" style={{ height: 220 }}>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name] || '#8892a4'} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state" style={{ padding: 40 }}>
                  <p>No order data yet</p>
                </div>
              )}
            </div>
            <div style={{ padding: '0 20px 16px', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {pieData.map((d) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[d.name] || '#8892a4', display: 'inline-block' }} />
                  {d.name} ({d.value})
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header">Low Stock Alerts</div>
            <div className="card-body">
              {stats?.low_stock_products?.length > 0 ? (
                <div>
                  {stats.low_stock_products.map((p) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, color: p.stock_quantity === 0 ? 'var(--red)' : 'var(--yellow)', fontWeight: 500 }}>
                          {p.stock_quantity} left
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>min: {p.low_stock_threshold}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 30 }}>
                  <p style={{ color: 'var(--green)' }}>✓ All products well-stocked</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">Recent Orders</div>
          <div className="table-wrapper">
            {stats?.recent_orders?.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer ID</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent_orders.map((o) => (
                    <tr key={o.id}>
                      <td className="primary">#{o.id.toString().padStart(4, '0')}</td>
                      <td>#{o.customer_id}</td>
                      <td style={{ color: 'var(--green)' }}>₹{parseFloat(o.total_amount).toFixed(2)}</td>
                      <td><span className={`badge badge-${o.status}`}>{o.status}</span></td>
                      <td>{o.created_at ? new Date(o.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <ShoppingCart className="icon" size={36} />
                <h3>No orders yet</h3>
                <p>Orders will appear here once created</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
