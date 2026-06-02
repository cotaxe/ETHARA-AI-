import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_API_URL ||
  'https://inventory-backend-e64u.onrender.com';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'An error occurred';
    return Promise.reject(new Error(msg));
  }
);

// Products
export const productsApi = {
  list: (params) => api.get('/products/', { params }).then(r => r.data),
  get: (id) => api.get(`/products/${id}`).then(r => r.data),
  create: (data) => api.post('/products/', data).then(r => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/products/${id}`).then(r => r.data),
  adjustStock: (id, data) => api.patch(`/products/${id}/stock`, data).then(r => r.data),
};

// Customers
export const customersApi = {
  list: (params) => api.get('/customers/', { params }).then(r => r.data),
  get: (id) => api.get(`/customers/${id}`).then(r => r.data),
  create: (data) => api.post('/customers/', data).then(r => r.data),
  update: (id, data) => api.put(`/customers/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/customers/${id}`).then(r => r.data),
};

// Orders
export const ordersApi = {
  list: (params) => api.get('/orders/', { params }).then(r => r.data),
  get: (id) => api.get(`/orders/${id}`).then(r => r.data),
  create: (data) => api.post('/orders/', data).then(r => r.data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }).then(r => r.data),
  delete: (id) => api.delete(`/orders/${id}`).then(r => r.data),
};

// Dashboard
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats').then(r => r.data),
};

export default api;
