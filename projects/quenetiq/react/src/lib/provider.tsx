import { createContext, useContext, type ReactNode } from 'react';
import type { QuenetiqClient } from '@quenetiq/client';
import type { CacheStore } from '@quenetiq/cache';

const QuenetiqContext = createContext<QuenetiqClient | null>(null);
const CacheContext = createContext<CacheStore | null>(null);

export interface QuenetiqProviderProps {
  client: QuenetiqClient;
  cache?: CacheStore;
  children: ReactNode;
}

export function QuenetiqProvider({ client, cache, children }: QuenetiqProviderProps): ReactNode {
  return (
    <QuenetiqContext.Provider value={client}>
      <CacheContext.Provider value={cache ?? null}>
        {children}
      </CacheContext.Provider>
    </QuenetiqContext.Provider>
  );
}

export function useClient(): QuenetiqClient {
  const client = useContext(QuenetiqContext);
  if (!client) {
    throw new Error(
      'No QuenetiqClient found in context. Wrap your app with <QuenetiqProvider client={client}>',
    );
  }
  return client;
}

export function useCache(): CacheStore | null {
  return useContext(CacheContext);
}
