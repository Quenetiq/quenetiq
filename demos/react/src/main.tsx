import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@quenetiq/client';
import { QuenetiqProvider } from '@quenetiq/react';
import { App } from './App';

const client = createClient({
  endpoint: '/graphql',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QuenetiqProvider client={client}>
      <App />
    </QuenetiqProvider>
  </StrictMode>,
);
