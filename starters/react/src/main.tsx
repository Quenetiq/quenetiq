import React from 'react';
import ReactDOM from 'react-dom/client';
import { QuenetiqProvider } from '@quenetiq/react';
import { createClient } from '@quenetiq/client';
import { createCache } from '@quenetiq/cache';
import App from './App';

const client = createClient({ endpoint: '/graphql' });
const cache = createCache();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QuenetiqProvider client={client} cache={cache}>
      <App />
    </QuenetiqProvider>
  </React.StrictMode>,
);
