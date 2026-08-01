import type { InjectOptions as AngularInjectOptions } from '@angular/core';

/**
 * Angular DI options forwarded to all internal `inject()` calls.
 * Merged directly into each inject* composable's options object.
 */
export interface QuenetiqInjectOptions {
	/** If true, returns null instead of throwing when token is not found. */
	readonly optional?: AngularInjectOptions['optional'];
	/** If true, only look in the current element's injector (skip parent). */
	readonly self?: AngularInjectOptions['self'];
	/** If true, start searching from the parent injector. */
	readonly skipSelf?: AngularInjectOptions['skipSelf'];
	/** If true, cross the host boundary. */
	readonly host?: AngularInjectOptions['host'];
}

/**
 * Extract the Angular DI flags from inject* options.
 *
 * The inject* options objects extend `QuenetiqInjectOptions` with feature
 * options (document, variables, skip, streamOn, ...) that must NOT be passed
 * into `inject()`. This helper picks only the DI-related keys so every
 * internal `inject()` call honors the same resolution flags.
 */
export function toInjectOptions(options?: QuenetiqInjectOptions): AngularInjectOptions {
	if (!options) return {};
	return {
		optional: options.optional,
		self: options.self,
		skipSelf: options.skipSelf,
		host: options.host,
	};
}
