import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { type GraphQLResult, type DocumentNode, print } from '@quenetiq/core';

export interface MockedRequest {
	query: string;
	variables?: Record<string, unknown>;
}

export interface MockedResponse<T = unknown> {
	request: MockedRequest;
	result: GraphQLResult<T>;
	delay?: number;
}

@Injectable()
export class MockGraphqlService {
	private readonly responses = new Map<string, MockedResponse[]>();
	private readonly defaultResponse$ = new BehaviorSubject<GraphQLResult<unknown>>({
		status: 'error',
		error: 'No mock response configured',
	});

	when<T>(request: MockedRequest, result: GraphQLResult<T> & { delay?: number }): void {
		const key = `${request.query}|${JSON.stringify(request.variables ?? {})}`;
		const existing = this.responses.get(key) ?? [];
		const { delay, ...resultOnly } = result;
		existing.push({ request, result: resultOnly as GraphQLResult<T>, delay });
		this.responses.set(key, existing);
	}

	query<T, TVars>(document: DocumentNode | string, variables?: TVars): Observable<GraphQLResult<T>> {
		const query = typeof document === 'string' ? document : print(document);
		const key = `${query}|${JSON.stringify(variables ?? {})}`;
		const entries = this.responses.get(key);
		if (entries && entries.length > 0) {
			const entry = entries.shift()!;
			const result = entry.result as GraphQLResult<T>;
			if (entry.delay) {
				return new Observable((sub) => {
					setTimeout(() => {
						sub.next(result);
						sub.complete();
					}, entry.delay);
				});
			}
			return of(result);
		}
		return of(this.defaultResponse$.value as GraphQLResult<T>);
	}

	mutate<T, TVars>(document: DocumentNode | string, variables?: TVars): Observable<GraphQLResult<T>> {
		return this.query<T, TVars>(document, variables);
	}

	refetch<T, TVars>(document: DocumentNode | string, variables?: TVars): Observable<GraphQLResult<T>> {
		return this.query<T, TVars>(document, variables);
	}

	poll<T, TVars>(
		document: DocumentNode | string,
		_intervalMs: number,
		variables?: TVars,
	): Observable<GraphQLResult<T>> {
		return this.query<T, TVars>(document, variables);
	}
}
