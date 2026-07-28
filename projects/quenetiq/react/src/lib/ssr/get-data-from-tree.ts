import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import type { GraphQLResult } from '@quenetiq/client';

export interface SSRContext {
	/** Collected query results keyed by a hash of document+variables. */
	readonly results: Map<string, GraphQLResult<unknown>>;
	/** Maximum number of render passes before giving up. */
	maxPasses?: number;
}

function createSSRContext(): SSRContext {
	return { results: new Map(), maxPasses: 50 };
}

/**
 * Render a React tree to a string, executing all suspended queries on the server.
 *
 * Usage:
 * ```tsx
 * const html = await getDataFromTree(
 *   <QuenetiqProvider client={client}>
 *     <App />
 *   </QuenetiqProvider>
 * );
 * ```
 *
 * This function catches promises thrown by `useSuspenseQuery` and
 * `useBackgroundQuery`, awaits them, and re-renders until the tree
 * is quiescent. All query results are collected in the returned
 * `SSRContext` for hydration on the client.
 */
export async function getDataFromTree(
	tree: ReactElement,
	ssrContext?: SSRContext,
): Promise<string> {
	const ctx = ssrContext ?? createSSRContext();
	const maxPasses = ctx.maxPasses ?? 50;

	let html = '';
	for (let pass = 0; pass < maxPasses; pass++) {
		const promises: Promise<unknown>[] = [];

		try {
			html = renderToString(tree);
			// If renderToString succeeded without throwing promises, we're done
			break;
		} catch (error) {
			// renderToString throws when a component throws a promise (Suspense)
			if (error instanceof Promise) {
				promises.push(error);
			} else {
				throw error;
			}
		}

		// Await all thrown promises
		if (promises.length > 0) {
			await Promise.all(promises);
		} else {
			break;
		}
	}

	return html;
}

/**
 * Render a React tree to a string and collect all query results.
 * Returns both the HTML string and the SSR context with collected results.
 */
export async function renderToStringWithData(
	tree: ReactElement,
): Promise<{ html: string; ssrContext: SSRContext }> {
	const ctx = createSSRContext();
	const html = await getDataFromTree(tree, ctx);
	return { html, ssrContext: ctx };
}

/**
 * Extract SSR state as a JSON-safe object for hydration.
 * Embed this in a `<script>` tag on the server.
 */
export function extractSSRData(ctx: SSRContext): Record<string, unknown> {
	const data: Record<string, unknown> = {};
	for (const [key, value] of ctx.results) {
		data[key] = value;
	}
	return data;
}
