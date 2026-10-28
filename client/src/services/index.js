import api, { unwrap, dataOf, download } from './api';

/*
 * Thin, typed-by-convention wrappers around the REST API.
 * List calls resolve to { data, meta }; single-resource calls resolve to the resource.
 */

export const authApi = {
  login: (body) => dataOf(api.post('/auth/login', body)),
  register: (body) => dataOf(api.post('/auth/register', body)),
  logout: () => api.post('/auth/logout'),
  logoutAll: () => api.post('/auth/logout-all'),
  me: () => dataOf(api.get('/auth/me')),
  updateMe: (body) => dataOf(api.patch('/auth/me', body)),
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append('avatar', file);
    return dataOf(api.post('/auth/me/avatar', fd));
  },
  changePassword: (body) => dataOf(api.post('/auth/change-password', body)),
  forgotPassword: (body) => dataOf(api.post('/auth/forgot-password', body)),
  verifyOtp: (body) => dataOf(api.post('/auth/verify-otp', body)),
  resetPassword: (body) => dataOf(api.post('/auth/reset-password', body)),
};

export const settingsApi = {
  public: () => dataOf(api.get('/settings/public')),
  list: () => dataOf(api.get('/settings')),
  update: (key, value) => dataOf(api.put(`/settings/${encodeURIComponent(key)}`, { value })),
};

export const catalogApi = {
  categories: (params) => dataOf(api.get('/categories', { params })),
  createCategory: (body) => dataOf(api.post('/categories', body)),
  updateCategory: (id, body) => dataOf(api.patch(`/categories/${id}`, body)),
  deleteCategory: (id) => dataOf(api.delete(`/categories/${id}`)),
  products: (params) => unwrap(api.get('/products', { params })),
  createProduct: (body) => dataOf(api.post('/products', body)),
  updateProduct: (id, body) => dataOf(api.patch(`/products/${id}`, body)),
  uploadProductImage: (id, file) => {
    const fd = new FormData();
    fd.append('image', file);
    return dataOf(api.post(`/products/${id}/image`, fd));
  },
};

export const inventoryApi = {
  list: (params) => unwrap(api.get('/inventory', { params })),
  create: (body) => dataOf(api.post('/inventory', body)),
  update: (id, body) => dataOf(api.patch(`/inventory/${id}`, body)),
  adjust: (id, body) => dataOf(api.post(`/inventory/${id}/adjust`, body)),
  transactions: (params) => unwrap(api.get('/inventory/transactions', { params })),
};

export const billingApi = {
  posConfig: () => dataOf(api.get('/billing/pos-config')),
  create: (body) => unwrap(api.post('/billing/invoices', body)),
  list: (params) => unwrap(api.get('/billing/invoices', { params })),
  get: (id) => dataOf(api.get(`/billing/invoices/${id}`)),
  print: (id) => dataOf(api.post(`/billing/invoices/${id}/print`)),
  cancel: (id, reason) => dataOf(api.post(`/billing/invoices/${id}/cancel`, { reason })),
};

export const customersApi = {
  list: (params) => unwrap(api.get('/customers', { params })),
  get: (id) => dataOf(api.get(`/customers/${id}`)),
  create: (body) => dataOf(api.post('/customers', body)),
  update: (id, body) => dataOf(api.patch(`/customers/${id}`, body)),
  collect: (id, body) => dataOf(api.post(`/customers/${id}/collect`, body)),
};

export const suppliersApi = {
  list: (params) => unwrap(api.get('/suppliers', { params })),
  get: (id) => dataOf(api.get(`/suppliers/${id}`)),
  create: (body) => dataOf(api.post('/suppliers', body)),
  update: (id, body) => dataOf(api.patch(`/suppliers/${id}`, body)),
};

export const procurementApi = {
  harvests: (params) => unwrap(api.get('/procurement/harvest-listings', { params })),
  harvest: (id) => dataOf(api.get(`/procurement/harvest-listings/${id}`)),
  lots: (params) => unwrap(api.get('/procurement/mandi-lots', { params })),
  lot: (id) => dataOf(api.get(`/procurement/mandi-lots/${id}`)),
  purchases: (params) => unwrap(api.get('/procurement/purchases', { params })),
  purchase: (id) => dataOf(api.get(`/procurement/purchases/${id}`)),
  createPurchase: (body) => dataOf(api.post('/procurement/purchases', body)),
  receivePurchase: (id, body) => dataOf(api.post(`/procurement/purchases/${id}/receive`, body)),
  cancelPurchase: (id, reason) => dataOf(api.post(`/procurement/purchases/${id}/cancel`, { reason })),
  payPurchase: (id, body) => dataOf(api.post(`/procurement/purchases/${id}/payments`, body)),
};

const listingForm = (files, field = 'images') => {
  const fd = new FormData();
  [...files].forEach((f) => fd.append(field, f));
  return fd;
};

export const farmerApi = {
  dashboard: () => dataOf(api.get('/farmers/dashboard')),
  crops: () => dataOf(api.get('/farmers/crops')),
  listings: (params) => unwrap(api.get('/farmers/listings', { params })),
  listing: (id) => dataOf(api.get(`/farmers/listings/${id}`)),
  create: (body) => dataOf(api.post('/farmers/listings', body)),
  update: (id, body) => dataOf(api.patch(`/farmers/listings/${id}`, body)),
  setStatus: (id, status) => dataOf(api.post(`/farmers/listings/${id}/status`, { status })),
  addImages: (id, files) => dataOf(api.post(`/farmers/listings/${id}/images`, listingForm(files))),
  removeImage: (id, url) => dataOf(api.delete(`/farmers/listings/${id}/images`, { data: { url } })),
};

export const mandiApi = {
  dashboard: () => dataOf(api.get('/mandi/dashboard')),
  products: () => dataOf(api.get('/mandi/products')),
  partners: () => dataOf(api.get('/mandi/partners')),
  setCommission: (commissionPercent) => dataOf(api.put('/mandi/commission', { commissionPercent })),
  lots: (params) => unwrap(api.get('/mandi/lots', { params })),
  lot: (id) => dataOf(api.get(`/mandi/lots/${id}`)),
  create: (body) => dataOf(api.post('/mandi/lots', body)),
  update: (id, body) => dataOf(api.patch(`/mandi/lots/${id}`, body)),
  setStatus: (id, status) => dataOf(api.post(`/mandi/lots/${id}/status`, { status })),
  addImages: (id, files) => dataOf(api.post(`/mandi/lots/${id}/images`, listingForm(files))),
  removeImage: (id, url) => dataOf(api.delete(`/mandi/lots/${id}/images`, { data: { url } })),
};

export const shopApi = {
  dashboard: () => dataOf(api.get('/shop/dashboard')),
};

export const ordersApi = {
  create: (body) => unwrap(api.post('/orders', body)),
  list: (params) => unwrap(api.get('/orders', { params })),
  get: (id) => dataOf(api.get(`/orders/${id}`)),
  transition: (id, body) => dataOf(api.post(`/orders/${id}/transition`, body)),
  receive: (id, body) => dataOf(api.post(`/orders/${id}/receive`, body)),
};

export const transportApi = {
  createRequest: (body) => dataOf(api.post('/transport/requests', body)),
  requests: (params) => unwrap(api.get('/transport/requests', { params })),
  request: (id) => dataOf(api.get(`/transport/requests/${id}`)),
  cancelRequest: (id, reason) => dataOf(api.post(`/transport/requests/${id}/cancel`, { reason })),
  claim: (id, body) => dataOf(api.post(`/transport/requests/${id}/claim`, body)),
  availableDrivers: (params) => dataOf(api.get('/transport/available-drivers', { params })),
  assign: (body) => dataOf(api.post('/transport/trips', body)),
  trips: (params) => unwrap(api.get('/transport/trips', { params })),
  trip: (id) => dataOf(api.get(`/transport/trips/${id}`)),
  transition: (id, body) => dataOf(api.post(`/transport/trips/${id}/transition`, body)),
  proof: (id, body, file) => {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => v !== undefined && v !== null && fd.append(k, v));
    if (file) fd.append('file', file);
    return dataOf(api.post(`/transport/trips/${id}/proof`, fd));
  },
};

export const trackingApi = {
  active: () => dataOf(api.get('/tracking/active')),
  locations: (id, params) => dataOf(api.get(`/tracking/trips/${id}/locations`, { params })),
  post: (id, body) => dataOf(api.post(`/tracking/trips/${id}/locations`, body)),
};

export const driverApi = {
  dashboard: () => dataOf(api.get('/drivers/dashboard')),
  earnings: () => dataOf(api.get('/drivers/earnings')),
};

export const vehiclesApi = {
  list: (params) => unwrap(api.get('/vehicles', { params })),
  get: (id) => dataOf(api.get(`/vehicles/${id}`)),
  create: (body) => dataOf(api.post('/vehicles', body)),
  update: (id, body) => dataOf(api.patch(`/vehicles/${id}`, body)),
  addDocument: (id, body, file) => {
    const fd = new FormData();
    Object.entries(body).forEach(([k, v]) => v && fd.append(k, v));
    fd.append('file', file);
    return dataOf(api.post(`/vehicles/${id}/documents`, fd));
  },
  removeDocument: (id, docId) => dataOf(api.delete(`/vehicles/${id}/documents/${docId}`)),
  verify: (id, body) => dataOf(api.post(`/vehicles/${id}/verify`, body)),
  verifyDocument: (id, docId, body) => dataOf(api.post(`/vehicles/${id}/documents/${docId}/verify`, body)),
};

export const paymentsApi = {
  list: (params) => unwrap(api.get('/payments', { params })),
  summary: () => dataOf(api.get('/payments/summary')),
  payOrder: (orderId, body) => dataOf(api.post(`/payments/orders/${orderId}`, body)),
  payTrip: (tripId, body) => dataOf(api.post(`/payments/trips/${tripId}`, body)),
};

export const settlementsApi = {
  list: (params) => unwrap(api.get('/settlements', { params })),
  get: (id) => dataOf(api.get(`/settlements/${id}`)),
};

export const notificationsApi = {
  list: (params) => unwrap(api.get('/notifications', { params })),
  unreadCount: () => dataOf(api.get('/notifications/unread-count')),
  markRead: (id) => dataOf(api.post(`/notifications/${id}/read`)),
  markAllRead: () => dataOf(api.post('/notifications/read-all')),
  broadcast: (body) => dataOf(api.post('/notifications/broadcast', body)),
};

export const reportsApi = {
  summary: (params) => dataOf(api.get('/reports/summary', { params })),
  export: (params) => download('/reports/export', params),
};

export const adminApi = {
  dashboard: (params) => dataOf(api.get('/admin/dashboard', { params })),
  users: (params) => unwrap(api.get('/admin/users', { params })),
  user: (id) => dataOf(api.get(`/admin/users/${id}`)),
  createUser: (body) => dataOf(api.post('/admin/users', body)),
  updateUser: (id, body) => dataOf(api.patch(`/admin/users/${id}`, body)),
  setStatus: (id, body) => dataOf(api.post(`/admin/users/${id}/status`, body)),
  revokeSessions: (id) => dataOf(api.post(`/admin/users/${id}/revoke-sessions`)),
};
