import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {ErrorBoundary} from './components/ErrorBoundary.tsx';
import './index.css';

// Guard browser APIs against sandboxed iframe restrictions
if (typeof window !== 'undefined') {
  // Safe alert wrapper for sandboxed iframes
  const originalAlert = window.alert;
  window.alert = (message?: unknown) => {
    try {
      originalAlert?.call(window, message);
    } catch {
      console.warn('[Alert Blocked by iFrame Sandbox]:', message);
    }
  };

  // Safe print wrapper for sandboxed iframes
  const originalPrint = window.print;
  window.print = () => {
    try {
      originalPrint?.call(window);
    } catch {
      console.warn('[Print Blocked by iFrame Sandbox]');
    }
  };

  // Global unhandled rejection & error listener
  window.addEventListener('unhandledrejection', (event) => {
    console.warn('[Handled UnhandledRejection]:', event.reason);
    if (event.preventDefault) {
      event.preventDefault();
    }
  });

  window.addEventListener('error', (event) => {
    console.warn('[Handled GlobalError]:', event.message || event.error);
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

