import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { print, type DocumentNode, type TypedDocumentNode, type TypedQueryString } from './gql';
import type { ErrorPolicy, RefetchQueryDef } from './graphql.service';
import { GraphqlService } from './graphql.service';
import type { GraphqlCacheLike } from './quenetiq-config';
import { QuenetiqConfigService } from './config.service';
import { injectQuery, type InjectQueryHandle } from './inject-query';
import { injectMutation } from './inject-mutation';
import { GqlSubscriptionWsClient } from './gql-subscription-impl';
import { resolveSubscriptionUrl } from './subscribe-multi';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseQueryOptions {
	readonly document: TypedQueryString<unknown, Record<string, unknown>>
		| DocumentNode
		| TypedDocumentNode<unknown, Record<string, unknown>>;
	readonly variables?: Record<string, unknown>;
	readonly endpoint?: string;
	/** Property name the handle is attached to. Default: `query`. */
	readonly property?: string;
	/** Auto-refetch every N milliseconds. */
	readonly pollInterval?: number;
	/** Skip the initial fetch. */
	readonly skip?: boolean;
	readonly errorPolicy?: ErrorPolicy;
	/**
	 * Auto-start streaming (`@defer`/`@stream`) for this query.
	 * When `undefined`, falls back to `config.streaming.streamOn`.
	 */
	readonly streamOn?: boolean | undefined;
	readonly placeholderData?: unknown;
}

export interface UseMutationOptions {
	readonly document: TypedQueryString<unknown, Record<string, unknown>>
		| DocumentNode
		| TypedDocumentNode<unknown, Record<string, unknown>>;
	readonly variables?: Record<string, unknown>;
	readonly endpoint?: string;
	/** Property name the handle is attached to. Default: `mutation`. */
	readonly property?: string;
	readonly optimistic?: (cache: GraphqlCacheLike) => string;
	readonly refetchQueries?: readonly RefetchQueryDef[];
}

export interface UseSubscriptionOptions {
	readonly document: DocumentNode;
	readonly variables?: Record<string, unknown>;
	readonly endpoint?: string;
	/** Property name the handle is attached to. Default: `subscription`. */
	readonly property?: string;
	/** Connect lazily. Default: true. */
	readonly enabled?: boolean;
}

// ─── Decorator plumbing ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClass = new (...args: any[]) => unknown;

type DecoratorSetup<T> = () => { value: T; cleanup?: () => void };

function attachToClass<T>(target: AnyClass, property: string, setup: DecoratorSetup<T>): AnyClass {
	const original = target;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const newConstructor: any = function (...args: unknown[]) {
		const instance = new original(...args);
		try {
			const { value, cleanup } = setup();
			Object.defineProperty(instance, property, {
				value,
				writable: false,
				configurable: true,
			});
			if (cleanup) {
				const prototype = original.prototype as Record<string, unknown>;
				const originalOnDestroy = typeof prototype['ngOnDestroy'] === 'function'
					? (prototype['ngOnDestroy'] as () => void)
					: null;
				prototype['ngOnDestroy'] = function () {
					originalOnDestroy?.call(this);
					cleanup();
				};
			}
		} catch {
			// Dependency not resolvable yet — the property stays undefined.
		}
		return instance;
	};

	newConstructor.prototype = original.prototype;
	Object.defineProperty(newConstructor, 'name', { value: original.name });
	return newConstructor;
}

// ─── @UseQuery ──────────────────────────────────────────────────────────────

/**
 * Class decorator that attaches a typed query handle to a component/service/directive.
 *
 * @example
 * ```typescript
 * @UseQuery({ document: GET_TODOS, pollInterval: 15_000 })
 * @Component({ ... })
 * export class TodosComponent {
 *   readonly todos = this.query.data;
 * }
 * ```
 */
export function UseQuery(options: UseQueryOptions) {
	return (target: AnyClass): AnyClass =>
		attachToClass(target, options.property ?? 'query', () => {
			const handle = injectQuery(
				options.document,
				options.endpoint,
				options.variables,
				{
					skip: options.skip,
					streamOn: options.streamOn,
					errorPolicy: options.errorPolicy,
					placeholderData: options.placeholderData as InjectQueryHandle<unknown>['data'],
				},
			);

			let timer: ReturnType<typeof setInterval> | null = null;
			if (options.pollInterval && options.pollInterval > 0 && !options.skip) {
				timer = setInterval(() => handle.refetch(), options.pollInterval);
			}

			return {
				value: handle,
				cleanup: () => {
					if (timer !== null) clearInterval(timer);
				},
			};
		});
}

// ─── @UseMutation ───────────────────────────────────────────────────────────

/**
 * Class decorator that attaches a typed mutation handle to a component/service/directive.
 *
 * @example
 * ```typescript
 * @UseMutation({ document: CREATE_TODO })
 * @Component({ ... })
 * export class CreateTodoComponent {
 *   submit() {
 *     this.mutation.mutate({ title: this.title }).subscribe(result => { ... });
 *   }
 * }
 * ```
 */
export function UseMutation(options: UseMutationOptions) {
	return (target: AnyClass): AnyClass =>
		attachToClass(target, options.property ?? 'mutation', () => {
			const handle = injectMutation(
				options.document,
				options.endpoint,
				{
					optimistic: options.optimistic,
					refetchQueries: options.refetchQueries,
				},
			);
			return { value: handle };
		});
}

// ─── @UseSubscription ───────────────────────────────────────────────────────

function resolveWsUrl(endpoint?: string): string | undefined {
	if (endpoint) {
		const resolved = resolveSubscriptionUrl(endpoint);
		if (resolved) return resolved;
	}
	const config = inject(QuenetiqConfigService, { optional: true });
	if (config?.subscriptions?.wsEndpoint) {
		return config.subscriptions.wsEndpoint;
	}
	const graphql = inject(GraphqlService);
	return graphql.endpoint
		.replace(/^https:\/\//, 'wss://')
		.replace(/^http:\/\//, 'ws://');
}

export interface UseSubscriptionHandle<T> {
	readonly data$: Observable<T>;
	readonly start: () => void;
	readonly stop: () => void;
}

/**
 * Class decorator that attaches a GraphQL subscription stream to a component/service/directive.
 *
 * @example
 * ```typescript
 * @UseSubscription({ document: ON_TODO_ADDED })
 * @Component({ ... })
 * export class TodosComponent {
 *   readonly newTodos$ = this.subscription.data$;
 * }
 * ```
 */
export function UseSubscription(options: UseSubscriptionOptions) {
	return (target: AnyClass): AnyClass =>
		attachToClass(target, options.property ?? 'subscription', () => {
			let ws: GqlSubscriptionWsClient | null = null;
			let unsubscribe: (() => void) | null = null;

			const data$ = new Observable<unknown>((subscriber) => {
				const wsUrl = resolveWsUrl(options.endpoint);
				if (!wsUrl) {
					subscriber.error(
						new Error('Quenetiq: Cannot resolve WebSocket URL for subscription. Provide an endpoint name or wsEndpoint config.'),
					);
					return;
				}

				ws = new GqlSubscriptionWsClient(wsUrl);
				const query = print(options.document);
				unsubscribe = ws.subscribe<unknown>(
					query,
					{
						next: (data) => subscriber.next(data),
						error: (err) => subscriber.error(err),
						complete: () => subscriber.complete(),
					},
					options.variables,
				);

				return () => {
					unsubscribe?.();
					unsubscribe = null;
					ws = null;
				};
			});

			const handle: UseSubscriptionHandle<unknown> = {
				data$,
				start: () => {
					if (unsubscribe) return;
					unsubscribe = data$.subscribe().unsubscribe;
				},
				stop: () => {
					unsubscribe?.();
					unsubscribe = null;
				},
			};

			return {
				value: handle,
				cleanup: () => {
					unsubscribe?.();
					unsubscribe = null;
				},
			};
		});
}
