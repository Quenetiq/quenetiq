import { Injectable, inject, type Provider, ENVIRONMENT_INITIALIZER, InjectionToken, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { tap } from 'rxjs';
import type { GraphQLResult } from './graphql.service';
import type { GraphqlMiddleware } from './middleware';
import { GRAPHQL_CACHE } from '@quenetiq/cache';

export interface SchemaDownloadConfig {
	endpoint?: string;
	headers?: Record<string, string>;
	format?: 'json' | 'sdl';
}

export interface DevtoolsConfig {
	autoConnect?: boolean;
	maxRequests?: number;
	captureSchema?: boolean;
	captureCache?: boolean;
	endpoint?: string;
	schemaDownload?: SchemaDownloadConfig;
}

export const DEVTOLS_CONFIG = new InjectionToken<DevtoolsConfig>('DEVTOLS_CONFIG');

const INTROSPECTION_MARKERS = ['__schema', 'IntrospectionQuery', '__type'];

function isIntrospectionQuery(query: string): boolean {
	return INTROSPECTION_MARKERS.some((m) => query.includes(m));
}

function sendToExtension(entry: Record<string, unknown>): void {
	if (typeof window === 'undefined') return;
	window.postMessage(
		{
			source: 'dumb-keystore-graphql-debug',
			type: 'graphql-request',
			payload: entry,
		},
		'*',
	);
}

function sendSchemaToExtension(schema: Record<string, unknown>): void {
	if (typeof window === 'undefined') return;
	window.postMessage(
		{
			source: 'dumb-keystore-graphql-debug',
			type: 'graphql-schema',
			payload: schema,
		},
		'*',
	);
}

function sendCacheEventToExtension(event: unknown): void {
	if (typeof window === 'undefined') return;
	window.postMessage(
		{
			source: 'dumb-keystore-graphql-debug',
			type: 'cache-event',
			payload: event,
		},
		'*',
	);
}

const MAX_REQUESTS = 500;

export function devtoolsMiddleware(config?: DevtoolsConfig): GraphqlMiddleware {
	const max = config?.maxRequests ?? MAX_REQUESTS;
	const captureSchema = config?.captureSchema ?? true;

	return (request, next) => {
		const startTime = performance.now();
		const body = JSON.stringify({ query: request.query, variables: request.variables });
		const endpointName = request.endpoint ?? 'default';

		return next(request).pipe(
			tap((result: GraphQLResult<unknown>) => {
				const endpoint = config?.endpoint ?? request.endpoint ?? '';
				const entry: Record<string, unknown> = {
					method: 'POST',
					url: endpoint,
					endpointName,
					body,
					startTime,
					endTime: performance.now(),
					duration: performance.now() - startTime,
					status: result.status === 'success' ? 200 : 400,
				};

				if (result.status === 'success') {
					entry['response'] = JSON.stringify({ data: result.data });

					if (captureSchema && isIntrospectionQuery(request.query)) {
						sendSchemaToExtension(result.data as Record<string, unknown>);
					}
				} else {
					entry['response'] = JSON.stringify({ errors: [{ message: result.error }] });
				}

				sendToExtension(entry);
				storeEntry(entry, max);
			}),
		);
	};
}

function storeEntry(entry: Record<string, unknown>, max: number): void {
	try {
		const raw = localStorage.getItem('__quenetiq_devtools_requests');
		const entries: Record<string, unknown>[] = raw ? JSON.parse(raw) : [];
		entries.push(entry);
		if (entries.length > max) entries.splice(0, entries.length - max);
		localStorage.setItem('__quenetiq_devtools_requests', JSON.stringify(entries));
	} catch {
		// localStorage may be unavailable
	}
}

@Injectable()
export class DevtoolsService {
	private readonly config: DevtoolsConfig;

	constructor() {
		this.config = inject(DEVTOLS_CONFIG, { optional: true }) ?? {};
		const destroyRef = inject(DestroyRef);

		if (this.config.autoConnect !== false) {
			this.connect();
		}

		const cache = inject(GRAPHQL_CACHE, { optional: true });
		if (this.config.captureCache !== false && cache?.onEvent) {
			cache.onEvent().pipe(takeUntilDestroyed(destroyRef)).subscribe({
				next: (event) => sendCacheEventToExtension(event),
				complete: () => this.disconnect(),
			});
		} else {
			this.disconnect();
		}
	}

	get devtoolsConfig(): DevtoolsConfig {
		return this.config;
	}

	connect(): void {
		if (typeof window === 'undefined') return;
		const handler = (event: MessageEvent): void => {
			if (event.source !== window) return;
			const msg = event.data;
			if (msg?.source === 'dumb-keystore-graphql-debug' && msg?.type === 'devtools-ready') {
				// send config (schemaDownload endpoint etc.)
				const configPayload: Record<string, unknown> = {};
				if (this.config.schemaDownload) {
					configPayload['schemaDownload'] = this.config.schemaDownload;
				}
				if (this.config.endpoint) {
					configPayload['endpoint'] = this.config.endpoint;
				}
				if (Object.keys(configPayload).length > 0) {
					window.postMessage(
						{
							source: 'dumb-keystore-graphql-debug',
							type: 'devtools-config',
							payload: configPayload,
						},
						'*',
					);
				}

				const raw = localStorage.getItem('__quenetiq_devtools_requests');
				if (raw) {
					try {
						const entries = JSON.parse(raw);
						window.postMessage(
							{
								source: 'dumb-keystore-graphql-debug',
								type: 'all-requests',
								payload: { requests: entries },
							},
							'*',
						);
					} catch {
						// ignore
					}
				}
			}
		};
		window.addEventListener('message', handler);
		this._handler = handler;
	}

	disconnect(): void {
		if (this._handler && typeof window !== 'undefined') {
			window.removeEventListener('message', this._handler);
			this._handler = null;
		}
	}

	private _handler: ((event: MessageEvent) => void) | null = null;
}

export function provideDevtools(config?: DevtoolsConfig): Provider[] {
	return [
		...(config ? [{ provide: DEVTOLS_CONFIG, useValue: config }] : []),
		DevtoolsService,
		{
			provide: ENVIRONMENT_INITIALIZER,
			multi: true,
			useValue: () => inject(DevtoolsService),
		},
	];
}
