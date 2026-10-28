import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Where the backend runs on this machine. The dev server forwards /api, /socket.io and /uploads to it,
// so the app works from one URL (localhost, LAN IP or a shared/forwarded port) with no CORS or cookie issues.
const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:5000';

// Through the proxy every call is same-origin for the browser, so the Origin header is dropped
// and the server's CORS allow-list (CLIENT_URL) does not need the shared URL.
const dropOrigin = (proxy) => {
  proxy.on('proxyReq', (req) => req.removeHeader('origin'));
  proxy.on('proxyReqWs', (req) => req.removeHeader('origin'));
};

const proxy = {
  '/api': { target: API_TARGET, changeOrigin: true, xfwd: true, configure: dropOrigin },
  '/uploads': { target: API_TARGET, changeOrigin: true },
  '/socket.io': { target: API_TARGET, changeOrigin: true, ws: true, xfwd: true, configure: dropOrigin },
};

export default defineConfig({
  plugins: [react()],
  // host + allowedHosts let forwarded / tunnel URLs (VS Code Ports, ngrok, LAN IP) open the dev server.
  server: { port: 5173, strictPort: false, host: true, allowedHosts: true, proxy },
  preview: { port: 4173, host: true, allowedHosts: true, proxy },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          maps: ['leaflet', 'react-leaflet'],
        },
      },
    },
  },
});