import { createRoot } from 'react-dom/client'
import { Suspense } from 'react'
import App from './App.tsx'
import './index.css'

const BootFallback = () => (
  <div
    style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
      fontSize: 14,
    }}
  >
    Loading application…
  </div>
);

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<BootFallback />}>
    <App />
  </Suspense>
);
