import { inject, Injectable } from '@angular/core';
import { type Observable, tap } from 'rxjs';
import type { DocumentNode, GraphQLResult } from '@quenetiq/core';
import { GraphqlService } from '@quenetiq/core';

export interface GraphqlDebugEntry {
	type: 'query' | 'mutate';
	document: string;
	variables?: Record<string, unknown>;
	timestamp: number;
	duration: number;
	result: GraphQLResult<unknown>;
	operationName?: string;
	fields?: string[];
}

function extractOperationName(query: string): string | undefined {
	const m = query.match(/(?:query|mutation)\s+(\w+)/);
	return m?.[1] ?? undefined;
}

function extractFields(query: string): string[] {
	const fields: string[] = [];
	const lines = query.split('\n');
	let depth = 0;
	const path: string[] = [];

	for (const line of lines) {
		const trimmed = line.replace(/#.*$/, '').trim();
		if (!trimmed) continue;

		for (const c of trimmed) {
			if (c === '{') {
				depth++;
			} else if (c === '}') {
				depth--;
				if (path.length) path.pop();
			}
		}

		const match = trimmed.match(/^\s*(\w+)/);
		if (match && depth > 0) {
			const name = match[1];
			if (!['query', 'mutation', 'fragment', 'on'].includes(name)) {
				fields.push(name);
				if (trimmed.includes('{')) path.push(name);
			}
		}
	}

	return fields;
}

@Injectable({ providedIn: 'root' })
export class GraphqlDebugService {
	private readonly svc = inject(GraphqlService);

	readonly entries: GraphqlDebugEntry[] = [];
	enabled = true;

	private push(entry: GraphqlDebugEntry): void {
		if (this.entries.length > 500) {
			this.entries.splice(0, this.entries.length - 500);
		}
		this.entries.push(entry);
	}

	query<TResponse, TVariables extends Record<string, unknown> = Record<string, unknown>>(
		document: DocumentNode,
		variables?: TVariables,
	): Observable<GraphQLResult<TResponse>> {
		const start = performance.now();
		const printed = document.loc?.source?.body ?? '(unknown)';

		return this.svc.query<TResponse, TVariables>(document, variables).pipe(
			tap((result) => {
				if (this.enabled) {
					this.push({
						type: 'query',
						document: printed,
						variables: variables as Record<string, unknown> | undefined,
						timestamp: start,
						duration: performance.now() - start,
						result: result as GraphQLResult<unknown>,
						operationName: extractOperationName(printed),
						fields: extractFields(printed),
					});
				}
			}),
		);
	}

	mutate<TResponse, TVariables extends Record<string, unknown> = Record<string, unknown>>(
		document: DocumentNode,
		variables?: TVariables,
	): Observable<GraphQLResult<TResponse>> {
		const start = performance.now();
		const printed = document.loc?.source?.body ?? '(unknown)';

		return this.svc.mutate<TResponse, TVariables>(document, variables).pipe(
			tap((result) => {
				if (this.enabled) {
					this.push({
						type: 'mutate',
						document: printed,
						variables: variables as Record<string, unknown> | undefined,
						timestamp: start,
						duration: performance.now() - start,
						result: result as GraphQLResult<unknown>,
						operationName: extractOperationName(printed),
						fields: extractFields(printed),
					});
				}
			}),
		);
	}

	clear(): void {
		this.entries.length = 0;
	}
}
