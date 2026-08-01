import {
	Directive,
	inject,
	DestroyRef,
	Injector,
	input,
	TemplateRef,
	ViewContainerRef,
	signal,
} from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { switchMap, of, tap, combineLatest } from 'rxjs';
import type { DocumentNode } from '../gql';
import { subscribeTo } from '../subscribe-multi';

export interface QuenetiqSubscriptionContext<T> {
	$implicit: T | null;
	data: T | null;
	loading: boolean;
	error: string | null;
	status: 'idle' | 'loading' | 'connected' | 'error';
}

@Directive({
	selector: '[qtqSubscription]',
	standalone: true,
})
export class QuenetiqSubscriptionDirective<T = unknown> {
	readonly subscription = input.required<DocumentNode | null>({ alias: 'qtqSubscription' });
	readonly quenetiqSubscriptionVars = input<Record<string, unknown>>({});
	readonly quenetiqSubscriptionEnabled = input(true);
	readonly quenetiqSubscriptionEndpoint = input<string | undefined>(undefined);

	private readonly templateRef = inject(TemplateRef<QuenetiqSubscriptionContext<T>>);
	private readonly viewContainer = inject(ViewContainerRef);
	private readonly injector = inject(Injector);
	private readonly destroyRef = inject(DestroyRef);

	private readonly loadingSignal = signal(true);
	private readonly dataSignal = signal<T | null>(null);
	private readonly errorSignal = signal<string | null>(null);
	private readonly statusSignal = signal<'idle' | 'loading' | 'connected' | 'error'>('loading');

	private readonly viewRef: ReturnType<typeof this.viewContainer.createEmbeddedView> | null = null;

	constructor() {
		this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, {
			$implicit: this.dataSignal(),
			data: this.dataSignal(),
			loading: this.loadingSignal(),
			error: this.errorSignal(),
			status: this.statusSignal(),
		});

		const doc$ = toObservable(this.subscription, { injector: this.injector });
		const vars$ = toObservable(this.quenetiqSubscriptionVars, { injector: this.injector });
		const enabled$ = toObservable(this.quenetiqSubscriptionEnabled, { injector: this.injector });
		const endpoint$ = toObservable(this.quenetiqSubscriptionEndpoint, { injector: this.injector });

		const sub = combineLatest([doc$, vars$, enabled$, endpoint$]).pipe(
			switchMap(([doc, vars, enabled, endpoint]) => {
				if (!doc || !enabled) {
					this.loadingSignal.set(false);
					this.statusSignal.set('idle');
					this.dataSignal.set(null);
					this.updateView();
					return of(null);
				}

				this.loadingSignal.set(true);
				this.statusSignal.set('loading');
				this.updateView();

				return subscribeTo<T>(endpoint, doc, vars).pipe(
					tap({
						next: (data) => {
							this.loadingSignal.set(false);
							this.statusSignal.set('connected');
							this.dataSignal.set(data);
							this.updateView();
						},
						error: (err) => {
							this.loadingSignal.set(false);
							this.statusSignal.set('error');
							this.errorSignal.set(err instanceof Error ? err.message : 'Subscription error');
							this.updateView();
						},
					}),
				);
			}),
		).subscribe();

		this.destroyRef.onDestroy(() => sub.unsubscribe());
	}

	private updateView(): void {
		if (!this.viewRef) return;
		const ctx = this.viewRef.context as QuenetiqSubscriptionContext<T>;
		ctx.loading = this.loadingSignal();
		ctx.data = this.dataSignal();
		ctx.$implicit = this.dataSignal();
		ctx.error = this.errorSignal();
		ctx.status = this.statusSignal();
		this.viewRef.markForCheck();
	}
}
