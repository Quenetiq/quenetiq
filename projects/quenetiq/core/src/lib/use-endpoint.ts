import { injectEndpoint } from './endpoint';

/**
 * Class decorator that binds an Angular component/service to a named GraphQL endpoint.
 *
 * The decorated class gets an `endpoint` property that resolves to the `GraphqlEndpoint`
 * for the given name at injection time.
 *
 * @example
 * ```typescript
 * @UseEndpoint('payments')
 * @Component({ ... })
 * export class PaymentsComponent {
 *   readonly ep = this.endpoint;
 *
 *   constructor() {
 *     this.ep.query(PAYMENTS_QUERY).subscribe(result => { ... });
 *   }
 * }
 * ```
 */
export function UseEndpoint(name: string) {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function <T extends new (...args: any[]) => any>(target: T) {
		const original = target;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const newConstructor: any = function (...args: unknown[]) {
			const instance = new original(...args);
			try {
				const ep = injectEndpoint(name);
				Object.defineProperty(instance, 'endpoint', {
					value: ep,
					writable: false,
					configurable: true,
				});
			} catch {
				// Endpoint not yet registered — leave undefined
			}
			return instance;
		};

		newConstructor.prototype = original.prototype;
		Object.defineProperty(newConstructor, 'name', { value: original.name });
		return newConstructor;
	};
}

/**
 * Factory function for resolving endpoint names to URLs at runtime.
 * Useful for dynamic endpoint resolution without Angular DI.
 */
export function createEndpointResolver(
	endpoints: Record<string, { url: string }>,
): (name: string) => string | undefined {
	return (name: string) => endpoints[name]?.url;
}

/**
 * Validate that all endpoint names in a group exist in the endpoints map.
 */
export function validateGroupRoutes(
	groupName: string,
	routeNames: string[],
	allRoutes: string[],
): string[] {
	const errors: string[] = [];
	for (const name of routeNames) {
		if (!allRoutes.includes(name)) {
			errors.push(`Group "${groupName}" references unknown route "${name}"`);
		}
	}
	return errors;
}
