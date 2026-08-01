import type { TransformFn } from './endpoints-config.types';

const transformRegistry = new Map<string, TransformFn>();

export function registerTransformError(name: string, fn: TransformFn): void {
	transformRegistry.set(name, fn);
}

export function resolveTransformError(name: string): TransformFn | undefined {
	return transformRegistry.get(name);
}

export function resolveHeaderEnvVars(
	headers: Record<string, string | (() => string)>,
): Record<string, string | (() => string)> {
	const resolved: Record<string, string | (() => string)> = {};
	for (const [key, value] of Object.entries(headers)) {
		if (typeof value === 'function') {
			resolved[key] = value;
			continue;
		}
		const envPattern = /\$\{(\w+)\}/g;
		if (envPattern.test(value)) {
			resolved[key] = () =>
				value.replace(envPattern, (_, envKey: string) => {
					try {
						const proc = (globalThis as Record<string, unknown>)['process'];
						if (typeof proc === 'object' && proc && 'env' in proc) {
							const env = proc['env'];
							if (typeof env === 'object' && env !== null) {
								const entries = Object.entries(env);
								const match = entries.find(([k]) => k === envKey);
								if (match) {
									const [, val] = match;
									if (typeof val === 'string') return val;
								}
							}
						}
					} catch {
					}
					try {
						if (typeof import.meta !== 'undefined' && 'env' in import.meta) {
							const metaEnv = (import.meta as unknown as { env: Record<string, string> }).env;
							if (metaEnv[envKey]) return metaEnv[envKey];
						}
					} catch {
					}
					return '';
				});
		} else {
			resolved[key] = value;
		}
	}
	return resolved;
}
