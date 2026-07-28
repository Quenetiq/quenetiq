import type { Observable } from 'rxjs';
import { tap } from 'rxjs';
import type { GraphQLResult } from '@quenetiq/core';
import type { GraphqlMiddleware as CoreMiddleware } from '@quenetiq/core';
import type { GraphqlMiddleware as ClientMiddleware } from '@quenetiq/client';
import { type SpanContext, type SpanAttributes } from './types';
import { getTracer, type MinimalTracer } from './tracer';

export interface OtelMiddlewareConfig {
	tracer?: MinimalTracer;
	/** Request attributes to add to every span. */
	attributes?: SpanAttributes;
	/** Parent span context for trace propagation. */
	parentContext?: SpanContext;
	/** Max query length to record in span attributes (0 to skip). Default 500. */
	maxQueryLength?: number;
}

function commonAttributes(
	req: { query: string; variables: Record<string, unknown>; type: string; endpoint?: string },
	maxQueryLength: number,
): SpanAttributes {
	const attrs: SpanAttributes = {
		'graphql.type': req.type,
	};
	if (req.endpoint) {
		attrs['graphql.endpoint'] = req.endpoint;
	}
	if (maxQueryLength > 0) {
		const q = req.query.slice(0, maxQueryLength);
		attrs['graphql.query'] = q;
	}
	return attrs;
}

/** Middleware for Angular/core (Observable) pipeline. */
export function otelMiddleware(config: OtelMiddlewareConfig = {}): CoreMiddleware {
	const tracer = config.tracer ?? getTracer();
	const maxQueryLength = config.maxQueryLength ?? 500;

	return (request, next) => {
		const attrs = commonAttributes(request, maxQueryLength);
		const span = tracer.startSpan(`graphql.${request.type}`, {
			parent: config.parentContext,
			attributes: { ...config.attributes, ...attrs },
		});

		request.headers['traceparent'] = span.spanContext.traceParent;

		return (next(request) as Observable<GraphQLResult<unknown>>).pipe(
			tap({
				next: (result) => {
					if (result.status === 'error') {
						span.setStatus({ code: 'ERROR', message: result.error });
						span.setAttribute('graphql.error_code', result.errorCode ?? 'UNKNOWN');
						if (result.graphQLErrors?.length) {
							span.setAttribute('graphql.graphql_errors', String(result.graphQLErrors.length));
						}
					} else {
						span.setStatus({ code: 'OK' });
						if (result.data) {
							span.setAttribute('graphql.has_data', true);
						}
					}
					span.end();
				},
				error: (err: Error) => {
					span.setStatus({ code: 'ERROR', message: err.message ?? String(err) });
					span.addEvent('exception', { 'exception.message': err.message ?? String(err) });
					span.end();
				},
			}),
		) as Observable<GraphQLResult<unknown>>;
	};
}

/** Middleware for client (Promise) pipeline. */
export function otelClientMiddleware(config: OtelMiddlewareConfig = {}): ClientMiddleware {
	const tracer = config.tracer ?? getTracer();
	const maxQueryLength = config.maxQueryLength ?? 500;

	return async (request, next) => {
		const attrs = commonAttributes(request, maxQueryLength);
		const span = tracer.startSpan(`graphql.${request.type}`, {
			parent: config.parentContext,
			attributes: { ...config.attributes, ...attrs },
		});

		request.headers['traceparent'] = span.spanContext.traceParent;

		try {
			const result = await next(request);
			if (result.status === 'error') {
				span.setStatus({ code: 'ERROR', message: result.error });
				span.setAttribute('graphql.error_code', result.errorCode ?? 'UNKNOWN');
			} else {
				span.setStatus({ code: 'OK' });
				if (result.data) {
					span.setAttribute('graphql.has_data', true);
				}
			}
			span.end();
			return result;
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			span.setStatus({ code: 'ERROR', message });
			span.addEvent('exception', { 'exception.message': message });
			span.end();
			throw err;
		}
	};
}
