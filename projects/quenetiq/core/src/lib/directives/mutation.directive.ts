import {
	Directive,
	inject,
	DestroyRef,
	input,
	TemplateRef,
	ViewContainerRef,
	signal,
} from '@angular/core';
import { tap } from 'rxjs';
import type { DocumentNode } from '../gql';
import { GraphqlService } from '../graphql.service';

export interface QuenetiqMutationContext<T> {
	$implicit: (variables?: Record<string, unknown>) => void;
	mutate: (variables?: Record<string, unknown>) => void;
	loading: boolean;
	data: T | null;
	error: string | null;
	status: 'idle' | 'loading' | 'success' | 'error';
}

@Directive({
	selector: '[qtqMutation]',
	standalone: true,
})
export class QuenetiqMutationDirective<T = unknown> {
	readonly mutation = input.required<DocumentNode | null>({ alias: 'qtqMutation' });
	readonly quenetiqMutationVars = input<Record<string, unknown>>({});

	private readonly graphql = inject(GraphqlService);
	private readonly templateRef = inject(TemplateRef<QuenetiqMutationContext<T>>);
	private readonly viewContainer = inject(ViewContainerRef);
	private readonly destroyRef = inject(DestroyRef);

	private readonly loadingSignal = signal(false);
	private readonly dataSignal = signal<T | null>(null);
	private readonly errorSignal = signal<string | null>(null);
	private readonly statusSignal = signal<'idle' | 'loading' | 'success' | 'error'>('idle');

	private readonly viewRef: ReturnType<typeof this.viewContainer.createEmbeddedView> | null = null;
	private currentSub: { unsubscribe(): void } | null = null;

	constructor() {
		this.viewRef = this.viewContainer.createEmbeddedView(this.templateRef, {
			$implicit: (vars?: Record<string, unknown>) => this.execute(vars),
			mutate: (vars?: Record<string, unknown>) => this.execute(vars),
			loading: this.loadingSignal(),
			data: this.dataSignal(),
			error: this.errorSignal(),
			status: this.statusSignal(),
		});
		this.destroyRef.onDestroy(() => this.currentSub?.unsubscribe());
	}

	private execute(variables?: Record<string, unknown>): void {
		const doc = this.mutation();
		if (!doc) return;

		this.currentSub?.unsubscribe();

		this.loadingSignal.set(true);
		this.statusSignal.set('loading');
		this.dataSignal.set(null);
		this.errorSignal.set(null);
		this.updateView();

		this.currentSub = this.graphql.mutate<T>(doc, variables ?? this.quenetiqMutationVars()).pipe(
			tap({
				next: (result) => {
					this.loadingSignal.set(false);
					if (result.status === 'success') {
						this.statusSignal.set('success');
						this.dataSignal.set(result.data);
					} else {
						this.statusSignal.set('error');
						this.errorSignal.set(result.error);
					}
					this.updateView();
				},
				error: () => {
					this.loadingSignal.set(false);
					this.statusSignal.set('error');
					this.errorSignal.set('Mutation error');
					this.updateView();
				},
			}),
		).subscribe();
	}

	private updateView(): void {
		if (!this.viewRef) return;
		const ctx = this.viewRef.context as QuenetiqMutationContext<T>;
		ctx.loading = this.loadingSignal();
		ctx.data = this.dataSignal();
		ctx.error = this.errorSignal();
		ctx.status = this.statusSignal();
		this.viewRef.markForCheck();
	}
}
