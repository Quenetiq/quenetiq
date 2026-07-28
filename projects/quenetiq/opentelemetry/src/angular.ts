import type { QuenetiqPlugin } from '@quenetiq/core';
import { otelMiddleware, type OtelMiddlewareConfig } from './middleware';

export function otelPlugin(config?: OtelMiddlewareConfig): QuenetiqPlugin {
	const mw = otelMiddleware(config);
	return {
		name: 'opentelemetry',
		getMiddleware: () => mw,
	};
}
