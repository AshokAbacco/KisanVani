import axios from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || new URL(API_BASE_URL).origin;

// The access token lives only in memory. The refresh token is an httpOnly cookie the browser sends to /auth.
let accessToken = null;
let sessionExpiredHandler = () => {};

export const setAccessToken = (t) => {
  accessToken = t;
};
export const getAccessToken = () => accessToken;
export const onSessionExpired = (fn) => {
  sessionExpiredHandler = fn;
};

const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true, timeout: 30000 });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;

/** Single-flight refresh: concurrent 401s wait for one refresh call. */
export const refreshSession = () => {
  if (!refreshing) {
    refreshing = axios
      .post(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        setAccessToken(res.data.data.accessToken);
        return res.data.data;
      })
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error;
    const code = response?.data?.error?.code;
    const isAuthCall = config?.url?.startsWith('/auth/login') || config?.url?.startsWith('/auth/refresh');
    if (response?.status === 401 && !config._retried && !isAuthCall && ['TOKEN_EXPIRED', 'INVALID_TOKEN', 'UNAUTHORIZED'].includes(code)) {
      config._retried = true;
      try {
        await refreshSession();
        return api(config);
      } catch {
        setAccessToken(null);
        sessionExpiredHandler();
      }
    }
    return Promise.reject(error);
  }
);

/** Returns { data, meta } from the standard API envelope. */
export const unwrap = (promise) => promise.then((r) => ({ data: r.data.data, meta: r.data.meta }));
/** Returns only the data part of the envelope. */
export const dataOf = (promise) => promise.then((r) => r.data.data);

/** Downloads a CSV/binary endpoint as a file. */
export const download = async (url, params, filename) => {
  const res = await api.get(url, { params, responseType: 'blob' });
  const name = filename || res.headers['content-disposition']?.match(/filename="(.+)"/)?.[1] || 'download';
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};

export default api;
