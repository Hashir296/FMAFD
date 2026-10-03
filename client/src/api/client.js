const BASE_URL = '/api';

export const getAuthToken = () => localStorage.getItem('finguard_token') || '';
export const setAuthToken = (token) => localStorage.setItem('finguard_token', token);
export const removeAuthToken = () => localStorage.removeItem('finguard_token');

async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { success: false, message: 'The server did not return JSON.' };
  }

  if (!response.ok) {
    const error = new Error(data?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return data;
}

export const api = {
  get: (url, params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') query.append(key, val);
    });
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`${url}${queryString}`, { method: 'GET' });
  },
  post: (url, body) => request(url, { method: 'POST', body: JSON.stringify(body) }),
  put: (url, body) => request(url, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (url, body) => request(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

export default api;
