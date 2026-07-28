import { EnvironmentProviders, inject, makeEnvironmentProviders, provideAppInitializer } from '@angular/core';
import { DevToolsService } from './devtools.service';

export { DevToolsService, type DevToolsTab, type CacheSnapshot } from './devtools.service';
export { DevToolsPanelComponent } from './devtools-panel.component';

/**
 * Enables the Quenetiq DevTools panel.
 * Registers the keyboard shortcut (Ctrl+Shift+D) to toggle the panel.
 *
 * Usage:
 * ```typescript
 * bootstrapApplication(App, {
 *   providers: [provideDevToolsPanel()],
 * });
 * ```
 *
 * Then add `<quenetiq-devtools-panel>` in your root component template.
 */
export function provideDevToolsPanel(): EnvironmentProviders {
	return makeEnvironmentProviders([
		provideAppInitializer(() => {
			const service = inject(DevToolsService);
			service.init();
		}),
	]);
}
