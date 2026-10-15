const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api/v1';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setStoredToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('token', token);
  }
}

export function clearStoredToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data: T; message?: string }> {
  const token = getStoredToken();
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
    throw new Error(json.error?.message || json.message || 'API request failed');
  }

  return json;
}

// Authentication API
export const authApi = {
  sendOtp: (phone: string, role = 'CUSTOMER') =>
    apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, role }),
    }),

  verifyOtp: (phone: string, otp: string, name?: string) =>
    apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, name }),
    }),

  getMe: () => apiRequest('/auth/me'),
};

// Vehicles API
export const vehiclesApi = {
  list: () => apiRequest('/vehicles'),
  create: (data: any) =>
    apiRequest('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  remove: (id: string) =>
    apiRequest(`/vehicles/${id}`, {
      method: 'DELETE',
    }),
};

// Services API
export const servicesApi = {
  list: (vehicleType?: string) =>
    apiRequest(`/services${vehicleType ? `?vehicleType=${vehicleType}` : ''}`),
  getById: (id: string) => apiRequest(`/services/${id}`),
};

// Bookings API
export const bookingsApi = {
  create: (data: any) =>
    apiRequest('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getById: (id: string) => apiRequest(`/bookings/${id}`),
  listMy: () => apiRequest('/bookings'),
  cancel: (id: string, reason: string) =>
    apiRequest(`/bookings/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  respondQuote: (id: string, approved: boolean, notes?: string) =>
    apiRequest(`/bookings/${id}/respond-quote`, {
      method: 'POST',
      body: JSON.stringify({ approved, notes }),
    }),
};

// Tracking API
export const trackingApi = {
  getTracking: (bookingId: string) => apiRequest(`/tracking/bookings/${bookingId}`),
};

// Payments API
export const paymentsApi = {
  createOrder: (bookingId: string, method: string) =>
    apiRequest('/payments/orders', {
      method: 'POST',
      body: JSON.stringify({ bookingId, method }),
    }),
  verify: (data: any) =>
    apiRequest('/payments/verify', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getByBooking: (bookingId: string) => apiRequest(`/payments/bookings/${bookingId}`),
};

// Reviews API
export const reviewsApi = {
  create: (bookingId: string, rating: number, comment?: string) =>
    apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify({ bookingId, rating, comment }),
    }),
  getByBooking: (bookingId: string) => apiRequest(`/reviews/bookings/${bookingId}`),
};
