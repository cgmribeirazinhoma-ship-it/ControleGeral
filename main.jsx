import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Registro do Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.info('[SW] Registrado:', reg.scope))
      .catch(err => console.warn('[SW] Falhou:', err.message));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
