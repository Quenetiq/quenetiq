import type { Directive, DirectiveBinding, App } from 'vue';
import type { DocumentNode, TypedDocumentNode } from '@quenetiq/client';
import type { QuenetiqClient } from '@quenetiq/client';

type MutateValue =
	| DocumentNode
	| TypedDocumentNode
	| {
			mutation: DocumentNode | TypedDocumentNode;
			variables?: Record<string, unknown>;
			onCompleted?: () => void;
			onError?: (err: string) => void;
	  };

let _client: QuenetiqClient | null = null;

export function registerDirectives(app: App, client: QuenetiqClient): void {
	_client = client;

	app.directive('dql-mutate', {
		mounted(el: HTMLElement, binding: DirectiveBinding<MutateValue>) {
			el.style.cursor = 'pointer';
			el.addEventListener('click', async () => {
				const value = binding.value;
				const mutation =
					value && typeof value === 'object' && 'mutation' in value ? value.mutation : (value as DocumentNode);
				const variables =
					value && typeof value === 'object' && 'mutation' in value
						? (value as { variables?: Record<string, unknown> }).variables
						: undefined;
				const onCompleted =
					value && typeof value === 'object' && 'mutation' in value
						? (value as { onCompleted?: () => void }).onCompleted
						: undefined;
				const onError =
					value && typeof value === 'object' && 'mutation' in value
						? (value as { onError?: (err: string) => void }).onError
						: undefined;

				const result = await _client!.mutate(mutation, variables);
				if (result.status === 'success') {
					onCompleted?.();
				} else {
					onError?.(result.error ?? 'Mutation failed');
				}
			});
		},
	} as Directive<HTMLElement, MutateValue>);

	app.directive('dql-loading', {
		mounted(el: HTMLElement, binding: DirectiveBinding<boolean>) {
			if (binding.value) el.classList.add('dql-loading');
		},
		updated(el: HTMLElement, binding: DirectiveBinding<boolean>) {
			el.classList.toggle('dql-loading', binding.value);
		},
	} as Directive<HTMLElement, boolean>);
}
