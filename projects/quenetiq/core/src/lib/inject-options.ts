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
