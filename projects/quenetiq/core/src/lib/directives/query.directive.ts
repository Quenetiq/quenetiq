import {
	Directive,
	inject,
	afterRenderEffect,
	DestroyRef,
	input,
	Injector,
	TemplateRef,
	ViewContainerRef,
	signal,
	type Signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Subject, switchMap, of, catchError, tap, combineLatest } from 'rxjs';
import type { DocumentNode } from '../gql';
import { GraphqlService, type GraphQLResult, type ErrorPolicy } from '../graphql.service';

export interface QuenetiqQueryContext<T> {
	$implicit: GraphQLResult<T>;
	result: GraphQLResult<T>;
	loading: boolean;
	error: string | null;
	refetch: () => void;
	data: T | null;
	status: 'idle' | 'loading' | 'success' | 'error';
	pollInterval: number;
	skip: boolean;
}

@Directive({
	selector: '[qtqQuery]',
	standalone: true,
})
export class QuenetiqQueryDirective<T = unknown> {
	readonly query = input<DocumentNode | null>(null);
	readonly quenetiqQueryVars = input<Record<string, unknown>>({});
	readonly quenetiqQueryEnabled = input(true);
	readonly quenetiqQueryPollInterval = input(0);
	readonly quenetiqQuerySkip = input(false);
	readonly quenetiqQueryErrorPolicy = input<ErrorPolicy>('none');
	readonly quenetiqQueryStreamOn = input(false);

	private readonly graphql = inject(GraphqlService);
	private readonly injector = inject(Injector);
	private readonly templateRef = inject(TemplateRef<QuenetiqQueryContext<T>>);
	private readonly viewContainer = inject(ViewContainerRef);
	private readonly destroyRef = inject(DestroyRef);

	private readonly refetch$ = new Subject<void>();
	private readonly doc$ = toObservable(this.query, { injector: this.injector });
	private readonly vars$ = toObservable(this.quenetiqQueryVars, { injector: this.injector });

	private readonly resultSignal = signal<GraphQLResult<T> | null>(null);
	private readonly loadingSignal = signal(true);

	protected readonly result: Signal<GraphQLResult<T> | null> = this.resultSignal;
	protected readonly loading: Signal<boolean> = this.loadingSignal;

	private pollIntervalId: ReturnType<typeof setInterval> | null = null;

	private viewRef: ReturnType<typeof this.viewContainer.createEmbeddedView> | null = null;

	constructor() {
		const enabled$ = toObservable(this.quenetiqQueryEnabled, { injector: this.injector });
		const skip$ = toObservable(this.quenetiqQuerySkip, { injector: this.injector });

		const query$ = combineLatest([this.refetch$, enabled$, skip$]).pipe(
			switchMap(([, enabled, skip]) => {
				if (!enabled || skip) return of(null);
				return this.doc$.pipe(
					switchMap((doc) => {
						if (!doc) return of(null);
						return this.vars$.pipe(
							switchMap((vars) => {
								const streaming = this.graphql.streaming;
								const streamOn = this.quenetiqQueryStreamOn() || streaming.streamOn === true;
								const useStream = streamOn && (streaming.enabled ?? true);
								const request$ = useStream
									? this.graphql.queryDefer<T>(doc, vars, undefined)
									: this.graphql.query<T>(doc, vars, undefined, {
										errorPolicy: this.quenetiqQueryErrorPolicy(),
									});
								return request$.pipe(
									tap({
										next: () => this.loadingSignal.set(false),
										error: () => this.loadingSignal.set(false),
									}),
									catchError((err: unknown) => {
										this.loadingSignal.set(false);
										const msg = err instanceof Error ? err.message : 'Query failed';
										return of({ status: 'error' as const, error: msg });
									}),
								);
							}),
						);
					}),
				);
			}),
		);

		const sub = query$.subscribe((r) => this.updateView(r));
		this.destroyRef.onDestroy(() => {
			sub.unsubscribe();
			if (this.pollIntervalId !== null) {
				clearInterval(this.pollIntervalId);
			}
		});

		/*
		 * Why afterRenderEffect instead of effect:
		 *
		 * In directive-based queries (non-signal query pattern), input signals
		 * (quenetiqQueryDoc, quenetiqQueryVars) are watched to trigger refetch on change.
		 * Using effect() for this would start the HTTP request during Angular's
		 * change detection phase, before the frame is painted. While the request is
		 * async (no NG0100 risk), it delays the first meaningful paint.
		 *
		 * afterRenderEffect defers the refetch trigger until after the frame is
		 * rendered, keeping the critical rendering path free of side-effect
		 * initiation. The HTTP response arrives asynchronously either way, so the
		 * user-visible timing is identical — but the rendering path stays cleaner.
		 *
		 * Use the signal-based query() function (from @quenetiq/core) when you need
		 * fully reactive, zone-less query execution without a ViewContainer ref.
		 */
		afterRenderEffect(() => {
			this.query();
			this.quenetiqQueryVars();
			this.refetch$.next();
		});

		afterRenderEffect(() => {
			const pollInterval = this.quenetiqQueryPollInterval();
			const skip = this.quenetiqQuerySkip();

			if (this.pollIntervalId !== null) {
				clearInterval(this.pollIntervalId);
				this.pollIntervalId = null;
			}

			if (pollInterval > 0 && !skip) {
				this.pollIntervalId = setInterval(() => this.refetch$.next(), pollInterval);
			}
		});
	}

	/** Expose refetch so callers can trigger manual re-fetch. */
	refetch(): void {
		this.refetch$.next();
	}

	private updateView(r: GraphQLResult<T> | null): void {
		this.resultSignal.set(r);
		if (!r) {
			this.viewContainer.clear();
			this.viewRef = null;
			return;
		}

		const errorText =
			r.status === 'error'
				? r.error
				: r.graphQLErrors && r.graphQLErrors.length > 0
					? r.graphQLErrors.map((e) => e.message).join('; ')
					: null;

		const data = r.status === 'success' ? r.data : null;
		const status: 'idle' | 'loading' | 'success' | 'error' = this.loadingSignal()
			? 'loading'
			: r.status === 'success'
				? 'success'
				: r.status === 'error'
					? 'error'
					: 'idle';
		const pollInterval = this.quenetiqQueryPollInterval();
		const skip = this.quenetiqQuerySkip();

		if (!this.viewRef) {
			this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, {
				$implicit: r,
				result: r,
				loading: this.loadingSignal(),
				error: errorText,
				refetch: () => this.refetch(),
				data,
				status,
				pollInterval,
				skip,
			});
		} else {
			const ctx = this.viewRef.context as QuenetiqQueryContext<T>;
			ctx.$implicit = r;
			ctx.result = r;
			ctx.loading = this.loadingSignal();
			ctx.error = errorText;
			ctx.data = data;
			ctx.status = status;
			ctx.pollInterval = pollInterval;
			ctx.skip = skip;
			this.viewRef.markForCheck();
		}
	}
}
