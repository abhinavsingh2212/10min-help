const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('admin_token');
}

export function setStoredAdminToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('admin_token', token);
  }
}

export function clearStoredAdminToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
  }
}

export async function adminApiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string }> {
  const token = getStoredAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.error?.message || json.message || 'Admin API request failed');
  }

  return json;
}

export const adminApi = {
  // Auth
  login: (phone: string, otp: string) =>
    adminApiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, role: 'ADMIN' }),
    }),
  getMe: () => adminApiRequest('/auth/me'),

  // KPIs & Dashboard
  getMetrics: (from?: string) =>
    adminApiRequest(`/admin/metrics${from ? `?from=${from}` : ''}`),
  getLiveMap: () => adminApiRequest('/admin/live-map'),

  // Bookings
  listBookings: (params: { status?: string; page?: number; limit?: number } = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());
    return adminApiRequest(`/admin/bookings?${query.toString()}`);
  },
  manualAssign: (bookingId: string, technicianId: string) =>
    adminApiRequest(`/admin/bookings/${bookingId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ technicianId }),
    }),

  // Technicians
  listTechnicians: (status?: string) =>
    adminApiRequest(`/admin/technicians${status ? `?status=${status}` : ''}`),
  updateTechnicianStatus: (id: string, status: string, notes?: string) =>
    adminApiRequest(`/admin/technicians/${id}/verification`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  // Services Pricing
  updateServicePricing: (id: string, startingPrice: any, isActive?: boolean) =>
    adminApiRequest(`/admin/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ startingPrice, isActive }),
    }),

  // Audit Logs
  getAuditLogs: (limit = 50) => adminApiRequest(`/admin/audit-logs?limit=${limit}`),
};
