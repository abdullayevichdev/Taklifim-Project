import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { attemptChunkErrorReloadOnce, isChunkLoadError } from './components/ErrorBoundary';

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    attemptChunkErrorReloadOnce();
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (isChunkLoadError(event.reason)) {
      attemptChunkErrorReloadOnce();
    }
  });
}

createRoot(document.getElementById('root')!).render(<App />);
