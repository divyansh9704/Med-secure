import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
if (!import.meta.env.VITE_API_URL) {
  // eslint-disable-next-line no-console
  console.warn('[api] VITE_API_URL not set, defaulting to', baseURL);
}

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// Attach JWT from localStorage to every request (for browsers that
// block third-party cookies). The backend also still accepts cookies.
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
