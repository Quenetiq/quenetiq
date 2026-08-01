import { inject, type App, type InjectionKey } from 'vue';
import type { QuenetiqClient } from '@quenetiq/client';
import { registerDirectives } from './directives';

export const QUENETIQ_CLIENT_KEY: InjectionKey<QuenetiqClient> = Symbol('quenetiq-client');

export function createQuenetiqPlugin(client: QuenetiqClient): { install: (app: App) => void } {
	return {
		install(app: App): void {
			app.provide(QUENETIQ_CLIENT_KEY, client);
			registerDirectives(app, client);
		},
	};
}

export function useClient(): QuenetiqClient {
	const client = inject(QUENETIQ_CLIENT_KEY, null);
	if (!client) {
		throw new Error('No QuenetiqClient found. Install the plugin: app.use(createQuenetiqPlugin(client))');
	}
	return client;
}
