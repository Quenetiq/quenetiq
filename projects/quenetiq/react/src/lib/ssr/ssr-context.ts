import { createContext, useContext } from 'react';
import type { GraphQLResult } from '@quenetiq/client';

export interface SSRState {
	readonly results: Map<string, GraphQLResult<unknown>>;
}

const SSRContext = createContext<SSRState | null>(null);

export function useSSRState(): SSRState | null {
	return useContext(SSRContext);
}

export function SSRContextProvider({
	children,
}: {
	readonly children: React.ReactNode;
}): React.ReactNode {
	// SSRContext.Provider is not needed here — getDataFromTree manages state externally
	return children;
}

export function createSSRState(): SSRState {
	return { results: new Map() };
}
