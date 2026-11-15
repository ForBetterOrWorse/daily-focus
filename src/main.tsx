import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { createStore } from './store/store';
import { AppDataProvider } from './store/use-app-data';
import './styles/global.css';

const store = createStore({ storage: window.localStorage, now: Date.now });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppDataProvider store={store}>
      <App />
    </AppDataProvider>
  </StrictMode>
);
